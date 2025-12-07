// ========== PHASE 2: PAYMENT & WITHDRAWAL ACTIONS ==========
// Functions for withdrawal requests, transaction management, and payment processing

'use server'

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdminClient, getAuthenticatedUser, authorizeAdmin } from '@/lib/serverUtils';
import { withdrawalRequestSchema, processWithdrawalSchema, Transaction } from '@/lib/schema';
import { logger } from '@/lib/utils/logger';
import type { TransactionRecord, WithdrawalRequestRecord } from '@/lib/types';
import { getBrokerWallets } from './wallet-actions';

// ========== TRANSACTION FUNCTIONS ==========

export async function getTransactions(userId: string): Promise<Transaction[]> {
    // Allow both admin and broker to fetch transactions
    const { user } = await getAuthenticatedUser();
    const supabaseAdmin = getSupabaseAdminClient();

    // Check if user is admin or the broker themselves
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAdmin = profile?.role === 'admin';
    const isSelf = user.id === userId;

    if (!isAdmin && !isSelf) {
        throw new Error('Unauthorized: You can only view your own transactions');
    }

    // Fetch transactions using wallet_id instead of user_id
    const { data: transactions, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('wallet_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    if (!transactions) return [];
    
    return transactions.map(t => ({
        id: t.id,
        walletId: t.wallet_id,
        walletType: t.wallet_type || 'direct',
        type: t.type,
        amount: t.amount,
        description: t.description,
        paymentMode: t.payment_mode,
        transactionId: t.transaction_id,
        proofUrl: t.proof_url,
        date: t.created_at,
    }));
}

export async function getBrokerTransactions(brokerId?: string): Promise<TransactionRecord[]> {
    let user;
    try {
        const result = await getAuthenticatedUser('broker');
        user = result.user;
    } catch {
        const result = await getAuthenticatedUser('admin');
        user = result.user;
    }
    
    const targetBrokerId = brokerId || user.id;
    
    // If not admin and trying to access another broker's data, deny
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
    if (profile?.role !== 'admin' && targetBrokerId !== user.id) {
        throw new Error("Unauthorized to access this data");
    }

    const { data: transactions, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('wallet_id', targetBrokerId)
        .order('created_at', { ascending: false });

    if (error) {
        logger.error("Error fetching transactions:", error);
        throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    if (!transactions) return [];
    
    // Fetch plot details for each transaction to enrich the description
    const enrichedTransactions = await Promise.all(transactions.map(async (t) => {
        let enhancedDescription = t.description;
        
        // Clean up old description format and remove commission terminology
        if (enhancedDescription.includes('commission from plot sale')) {
            const plotMatch = enhancedDescription.match(/Plot #(\d+)[^-]*-\s*(.+?)(?:\s*-\s*Plot\s*#|$)/);
            if (plotMatch) {
                const plotNum = plotMatch[1];
                const projectName = plotMatch[2];
                const walletType = t.wallet_type === 'direct' ? 'Direct Sale' : 'Downline Sale';
                enhancedDescription = `${walletType} Earnings from plot #${plotNum} - ${projectName}`;
            }
        }
        
        // If transaction has a plot_id and description doesn't already contain plot details, enhance it
        if (t.plot_id && !enhancedDescription.includes('Plot #')) {
            const { data: plot } = await supabaseAdmin
                .from('plots')
                .select('plot_number, project_name')
                .eq('id', t.plot_id)
                .single();
            
            if (plot) {
                enhancedDescription = `${enhancedDescription} - Plot #${plot.plot_number}, ${plot.project_name}`;
            }
        }
        
        return {
            id: t.id,
            walletId: t.wallet_id,
            walletType: t.wallet_type || 'direct',
            type: t.type,
            amount: t.amount,
            description: enhancedDescription,
            paymentMode: t.payment_mode || null,
            transactionId: t.reference_id,
            proofUrl: null,
            status: t.status || 'completed',
            note: null,
            processedBy: null,
            date: t.created_at || t.date,
            processedAt: t.created_at || t.date,
        };
    }));
    
    return enrichedTransactions;
}

// ========== WITHDRAWAL REQUEST FUNCTIONS ==========

export async function requestWithdrawal(values: z.infer<typeof withdrawalRequestSchema>) {
    const { user } = await getAuthenticatedUser('broker');
    
    const wallet = await getBrokerWallets();
    if (!wallet) {
        throw new Error("Wallet not found");
    }

    // Get broker profile info
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

    if (!profile) {
        throw new Error("Broker profile not found");
    }

    // Check for pending withdrawal requests
    const { data: pendingWithdrawals, error: pendingError } = await supabaseAdmin
        .from('withdrawal_requests')
        .select('amount')
        .eq('broker_id', user.id)
        .eq('status', 'pending');

    if (pendingError) {
        throw new Error(`Failed to check pending withdrawals: ${pendingError.message}`);
    }

    // Calculate total pending withdrawals
    const totalPending = (pendingWithdrawals || []).reduce((sum, w) => sum + w.amount, 0);
    
    // Calculate available balance (total - pending withdrawals)
    const availableBalance = wallet.totalBalance - totalPending;
    
    logger.dev('Withdrawal validation:', {
        totalBalance: wallet.totalBalance,
        totalPending,
        availableBalance,
        requestedAmount: values.amount
    });

    if (availableBalance < values.amount) {
        throw new Error(
            `Insufficient available balance. Available: ₹${availableBalance.toFixed(2)} ` +
            `(Total: ₹${wallet.totalBalance.toFixed(2)}, Pending: ₹${totalPending.toFixed(2)})`
        );
    }
    
    const { data: newRequest, error } = await supabaseAdmin
        .from('withdrawal_requests')
        .insert({
            broker_id: user.id,
            broker_name: profile.full_name || 'Unknown',
            broker_email: profile.email || 'Unknown',
            amount: values.amount,
            status: 'pending',
            note: values.note || null,
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create withdrawal request: ${error.message}`);
    }

    revalidatePath('/broker/transactions');
    revalidatePath('/admin/transactions');
}

export async function getBrokerWithdrawalRequests(brokerId?: string): Promise<WithdrawalRequestRecord[]> {
    let user;
    try {
        const result = await getAuthenticatedUser('broker');
        user = result.user;
    } catch {
        const result = await getAuthenticatedUser('admin');
        user = result.user;
    }
    
    const targetBrokerId = brokerId || user.id;
    
    // If not admin and trying to access another broker's data, deny
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
    if (profile?.role !== 'admin' && targetBrokerId !== user.id) {
        throw new Error("Unauthorized to access this data");
    }

    const { data: withdrawals, error } = await supabaseAdmin
        .from('withdrawal_requests')
        .select('*')
        .eq('broker_id', targetBrokerId)
        .order('requested_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch withdrawal requests: ${error.message}`);
    }

    if (!withdrawals) return [];
    
    return withdrawals.map(w => ({
        id: w.id,
        brokerId: w.broker_id,
        brokerName: w.broker_name,
        brokerEmail: w.broker_email,
        amount: w.amount,
        status: w.status,
        note: w.note,
        paymentType: w.payment_type,
        proofImageUrl: w.proof_image_url,
        processedBy: w.processed_by,
        rejectionReason: w.rejection_reason,
        requestedAt: w.requested_at,
        processedAt: w.processed_at,
    }));
}

export async function getAllWithdrawalRequests(): Promise<WithdrawalRequestRecord[]> {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    
    const { data: withdrawals, error } = await supabaseAdmin
        .from('withdrawal_requests')
        .select('*')
        .order('requested_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch withdrawal requests: ${error.message}`);
    }

    if (!withdrawals) return [];
    
    return withdrawals.map(w => ({
        id: w.id,
        brokerId: w.broker_id,
        brokerName: w.broker_name,
        brokerEmail: w.broker_email,
        amount: w.amount,
        status: w.status,
        note: w.note,
        paymentType: w.payment_type,
        proofImageUrl: w.proof_image_url,
        processedBy: w.processed_by,
        rejectionReason: w.rejection_reason,
        requestedAt: w.requested_at,
        processedAt: w.processed_at,
    }));
}

export async function processWithdrawalRequest(values: z.infer<typeof processWithdrawalSchema>) {
    const { user } = await getAuthenticatedUser('admin');
    const { requestId, action, paymentType, proofImageUrl, rejectionReason } = values;
    const supabaseAdmin = getSupabaseAdminClient();

    // Get withdrawal request from Supabase
    const { data: withdrawalData, error: fetchError } = await supabaseAdmin
        .from('withdrawal_requests')
        .select('*')
        .eq('id', requestId)
        .single();
    
    if (fetchError || !withdrawalData) {
        throw new Error("Withdrawal request not found");
    }

    if (withdrawalData.status !== 'pending') {
        throw new Error("This withdrawal request has already been processed");
    }

    const updateData: any = {
        status: action === 'approve' ? 'approved' : 'rejected',
        processed_by: user.id,
        processed_at: new Date().toISOString(),
    };

    if (action === 'approve') {
        if (!paymentType) {
            throw new Error("Payment type is required for approval");
        }
        updateData.payment_type = paymentType;
        updateData.proof_image_url = proofImageUrl || null;

        // Fetch broker wallet to validate sufficient balance
        const { data: wallet, error: walletFetchErr } = await supabaseAdmin
            .from('wallets')
            .select('owner_id, direct_sale_balance, downline_sale_balance, total_balance')
            .eq('owner_id', withdrawalData.broker_id)
            .single();
        if (walletFetchErr || !wallet) {
            throw new Error('Broker wallet not found');
        }
        const amount = withdrawalData.amount;
        if (amount <= 0) throw new Error('Invalid withdrawal amount');
        if ((wallet.total_balance || 0) < amount) {
            throw new Error('Insufficient total balance');
        }
        // Prefer deducting from direct balance first, then downline balance
        let remaining = amount;
        let newDirect = wallet.direct_sale_balance || 0;
        let newDownline = wallet.downline_sale_balance || 0;
        if (newDirect >= remaining) {
            newDirect -= remaining;
            remaining = 0;
        } else {
            remaining -= newDirect;
            newDirect = 0;
            if (newDownline >= remaining) {
                newDownline -= remaining;
                remaining = 0;
            } else {
                throw new Error('Insufficient combined balance');
            }
        }
        const newTotal = (wallet.total_balance || 0) - amount;
        const { error: walletUpdateErr } = await supabaseAdmin
            .from('wallets')
            .update({
                direct_sale_balance: newDirect,
                downline_sale_balance: newDownline,
                total_balance: newTotal,
                updated_at: new Date().toISOString()
            })
            .eq('owner_id', withdrawalData.broker_id);
        if (walletUpdateErr) {
            throw new Error(`Failed to update wallet balance: ${walletUpdateErr.message}`);
        }

        // Record debit transaction (withdrawal)
        const { error: transactionError } = await supabaseAdmin
            .from('transactions')
            .insert({
                wallet_id: withdrawalData.broker_id,
                wallet_type: 'direct',
                type: 'debit',
                amount: amount,
                description: `Withdrawal approved - ${paymentType}`,
                status: 'completed',
                reference_id: requestId,
            });

        if (transactionError) {
            throw new Error(`Failed to create transaction: ${transactionError.message}`);
        }
    } else {
        if (!rejectionReason) {
            throw new Error("Rejection reason is required");
        }
        updateData.rejection_reason = rejectionReason;
    }

    // Update withdrawal request in Supabase
    const { error: updateError } = await supabaseAdmin
        .from('withdrawal_requests')
        .update(updateData)
        .eq('id', requestId);

    if (updateError) {
        throw new Error(`Failed to update withdrawal request: ${updateError.message}`);
    }

    revalidatePath('/admin/transactions');
    revalidatePath('/broker/transactions');
}
