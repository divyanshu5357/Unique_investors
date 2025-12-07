'use server'

import { z } from 'zod';
import { logger } from '../utils/logger';
import { 
    getSupabaseAdminClient,
    getAuthenticatedUser,
    authorizeAdmin,
    manageWalletSchema
} from '../serverUtils';
import { revalidatePath } from 'next/cache';
import { Wallet } from '../schema';

export async function getBrokerWallets(): Promise<Wallet | null> {
    const { user } = await getAuthenticatedUser('broker');
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: wallet, error } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('owner_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch wallet: ${error.message}`);
    }

    if (!wallet) {
        logger.dev(`No wallet found for broker ${user.id}, creating one.`);
        
        const { data: newWallet, error: createError } = await supabaseAdmin
            .from('wallets')
            .insert({
                owner_id: user.id,
                direct_sale_balance: 0,
                downline_sale_balance: 0,
                total_balance: 0,
            })
            .select()
            .single();

        if (createError) {
            throw new Error(`Failed to create wallet: ${createError.message}`);
        }

        return {
            id: newWallet.id,
            ownerId: newWallet.owner_id,
            directSaleBalance: newWallet.direct_sale_balance,
            downlineSaleBalance: newWallet.downline_sale_balance,
            totalBalance: newWallet.total_balance,
        };
    }

    return {
        id: wallet.id,
        ownerId: wallet.owner_id,
        directSaleBalance: wallet.direct_sale_balance,
        downlineSaleBalance: wallet.downline_sale_balance,
        totalBalance: wallet.total_balance,
    };
}

export async function manageBrokerWallet(values: z.infer<typeof manageWalletSchema>) {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    const { brokerId, type, amount, walletType, description, transactionId } = values;

    const increment = type === 'credit' ? amount : -amount;
    
    try {
        const { data: existingWallet, error: fetchError } = await supabaseAdmin
            .from('wallets')
            .select('*')
            .eq('owner_id', brokerId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw new Error(`Failed to fetch wallet: ${fetchError.message}`);
        }

        if (!existingWallet) {
            const { error: createError } = await supabaseAdmin
                .from('wallets')
                .insert({
                    owner_id: brokerId,
                    direct_sale_balance: walletType === 'direct' ? increment : 0,
                    downline_sale_balance: walletType === 'downline' ? increment : 0,
                    total_balance: increment,
                });

            if (createError) {
                throw new Error(`Failed to create wallet: ${createError.message}`);
            }
        } else {
            const { error: walletError } = await supabaseAdmin.rpc('upsert_wallet_balance', {
                wallet_id: brokerId,
                wallet_type: walletType,
                increment_amount: increment
            });

            if (walletError) {
                throw new Error(`Failed to update wallet: ${walletError.message}`);
            }
        }
        
        const { error: transactionError } = await supabaseAdmin
            .from('transactions')
            .insert({
                wallet_id: brokerId,
                type: type === 'credit' ? 'credit' : (type === 'debit' ? 'debit' : 'commission'),
                amount,
                description,
                reference_id: transactionId ? crypto.randomUUID() : null,
            });

        if (transactionError) {
            throw new Error(`Failed to create transaction: ${transactionError.message}`);
        }

        logger.dev(`✅ Wallet transaction successful:`, { brokerId, type, amount, walletType });

        revalidatePath('/admin/brokers');
        revalidatePath('/admin/associates');
        revalidatePath('/broker/dashboard');
        revalidatePath('/broker/wallets');
    } catch (error) {
        logger.error("❌ Error managing wallet:", error);
        throw error instanceof Error ? error : new Error("Failed to process wallet transaction.");
    }
}

export async function reversePlotFinancials(plotId: string, originalPlot: any) {
    const supabaseAdmin = getSupabaseAdminClient();
    const reversedAt = new Date().toISOString();
    try {
        logger.dev('🧹 Starting financial reversal for plot:', { plotId, originalStatus: originalPlot.status });

        const sellerId = originalPlot.updated_by || originalPlot.broker_id;
        if (!sellerId) {
            logger.dev('⚠️ No seller/broker ID found on original plot; skipping direct commission reversal.');
        }

        if (originalPlot.status === 'sold' && sellerId) {
            const saleAmount = originalPlot.sold_amount || originalPlot.sale_price || 0;
            const commissionRate = originalPlot.commission_rate || 6;
            if (saleAmount > 0) {
                const directCommission = (saleAmount * commissionRate) / 100;
                logger.dev('🧮 Direct commission to reverse:', { saleAmount, commissionRate, directCommission });
                
                const { data: sellerWallet } = await supabaseAdmin
                    .from('wallets')
                    .select('id, owner_id, direct_sale_balance, downline_sale_balance, total_balance')
                    .eq('owner_id', sellerId)
                    .single();
                if (sellerWallet) {
                    const newDirect = Math.max((sellerWallet.direct_sale_balance || 0) - directCommission, 0);
                    const newTotal = Math.max((sellerWallet.total_balance || 0) - directCommission, 0);
                    const { error: updateSellerWalletErr } = await supabaseAdmin
                        .from('wallets')
                        .update({
                            direct_sale_balance: newDirect,
                            total_balance: newTotal,
                            updated_at: reversedAt,
                        })
                        .eq('owner_id', sellerId);
                    if (updateSellerWalletErr) {
                        logger.error('Failed to update seller wallet during reversal:', updateSellerWalletErr.message);
                    } else {
                        logger.dev('✅ Seller wallet reversed:', { sellerId, newDirect, newTotal });
                    }
                }
                
                const { error: reverseSellerTxErr } = await supabaseAdmin
                    .from('transactions')
                    .update({ status: 'reversed', is_reversed: true })
                    .eq('plot_id', plotId)
                    .eq('wallet_id', sellerId)
                    .eq('wallet_type', 'direct')
                    .eq('is_reversed', false);
                if (reverseSellerTxErr) {
                    logger.error('Failed to mark seller transaction reversed:', reverseSellerTxErr.message);
                }
            }
        }

        const { data: commissionRows, error: commissionFetchErr } = await supabaseAdmin
            .from('commissions')
            .select('id, receiver_id, amount, level')
            .eq('plot_id', plotId)
            .eq('is_reversed', false);
        if (commissionFetchErr) {
            logger.error('Failed to fetch commissions for reversal:', commissionFetchErr.message);
        } else if (commissionRows && commissionRows.length) {
            logger.dev(`🔁 Reversing ${commissionRows.length} upline commission records...`);
            for (const row of commissionRows) {
                const { data: uplineWallet } = await supabaseAdmin
                    .from('wallets')
                    .select('id, owner_id, direct_sale_balance, downline_sale_balance, total_balance')
                    .eq('owner_id', row.receiver_id)
                    .single();
                if (uplineWallet) {
                    const newDownline = Math.max((uplineWallet.downline_sale_balance || 0) - row.amount, 0);
                    const newTotal = Math.max((uplineWallet.total_balance || 0) - row.amount, 0);
                    const { error: updateUplineErr } = await supabaseAdmin
                        .from('wallets')
                        .update({
                            downline_sale_balance: newDownline,
                            total_balance: newTotal,
                            updated_at: reversedAt,
                        })
                        .eq('owner_id', row.receiver_id);
                    if (updateUplineErr) {
                        logger.error(`Failed to update upline wallet (${row.receiver_id}) during reversal:`, updateUplineErr.message);
                    } else {
                        logger.dev('✅ Upline wallet reversed:', { receiverId: row.receiver_id, newDownline, newTotal });
                    }
                }
                
                const { error: reverseUplineTxErr } = await supabaseAdmin
                    .from('transactions')
                    .update({ status: 'reversed', is_reversed: true })
                    .eq('plot_id', plotId)
                    .eq('wallet_id', row.receiver_id)
                    .eq('wallet_type', 'downline')
                    .eq('is_reversed', false);
                if (reverseUplineTxErr) {
                    logger.error('Failed to mark upline transaction reversed:', reverseUplineTxErr.message);
                }
            }
            
            const { error: markCommissionsErr } = await supabaseAdmin
                .from('commissions')
                .update({ is_reversed: true, reversed_at: reversedAt })
                .eq('plot_id', plotId)
                .eq('is_reversed', false);
            if (markCommissionsErr) {
                logger.error('Failed to mark commissions reversed:', markCommissionsErr.message);
            } else {
                logger.dev('✅ Commission records flagged as reversed');
            }
        } else {
            logger.dev('ℹ️ No upline commissions to reverse for this plot.');
        }

        const { error: bulkTxErr } = await supabaseAdmin
            .from('transactions')
            .update({ status: 'reversed', is_reversed: true })
            .eq('plot_id', plotId)
            .eq('is_reversed', false);
        if (bulkTxErr) {
            logger.error('Failed bulk transaction reversal update:', bulkTxErr.message);
        }

        revalidatePath('/admin/commissions');
        revalidatePath('/admin/brokers');
        revalidatePath('/admin/associates');
        revalidatePath('/broker/wallets');

        return { success: true, message: 'Financials reversed successfully' };
    } catch (error) {
        logger.error('❌ Error reversing plot financials:', error);
        return { success: false, message: (error as Error).message };
    }
}

export async function setBookedPlotAmounts(plotId: string, totalAmount: number, bookingAmount?: number) {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    try {
        if (!plotId) throw new Error('plotId required');
        if (!totalAmount || totalAmount <= 0) throw new Error('totalAmount must be > 0');
        if (bookingAmount !== undefined && (bookingAmount < 0 || bookingAmount > totalAmount)) {
            throw new Error('bookingAmount must be >= 0 and <= totalAmount');
        }

        const { data: plot, error: plotErr } = await supabaseAdmin
            .from('plots')
            .select('id, status, broker_id, commission_status, total_plot_amount, booking_amount, area')
            .eq('id', plotId)
            .single();
        if (plotErr || !plot) throw new Error('Plot not found');
        if (plot.status.toLowerCase() !== 'booked') {
            throw new Error('Can only set amounts for booked plots');
        }

        const { data: payments, error: payErr } = await supabaseAdmin
            .from('payment_history')
            .select('amount_received')
            .eq('plot_id', plotId);
        if (payErr) throw new Error(`Failed to fetch payments: ${payErr.message}`);
        const totalPaid = (payments || []).reduce((s, p) => s + Number(p.amount_received || 0), 0);

        let effectiveBooking = bookingAmount !== undefined ? bookingAmount : (plot.booking_amount || 0);
        if (!effectiveBooking && payments && payments.length > 0) {
            effectiveBooking = Number(payments[0].amount_received || 0);
        }
        if (effectiveBooking > totalAmount) effectiveBooking = totalAmount;

        const remaining = Math.max(totalAmount - totalPaid, 0);
        const paidPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

        const update: any = {
            total_plot_amount: totalAmount,
            booking_amount: effectiveBooking || null,
            remaining_amount: remaining,
            paid_percentage: paidPercentage,
            updated_at: new Date().toISOString(),
        };

        const thresholdReached = paidPercentage >= 50;
        if (thresholdReached && plot.status.toLowerCase() === 'booked') {
            update.status = 'sold';
        }

        const { error: updateErr } = await supabaseAdmin
            .from('plots')
            .update(update)
            .eq('id', plotId);
        if (updateErr) throw new Error(`Failed to update plot amounts: ${updateErr.message}`);

        revalidatePath('/admin/booked-plots');
        revalidatePath('/admin/inventory');
        revalidatePath('/admin/commissions');
        revalidatePath('/admin/brokers');
        revalidatePath('/admin/associates');

        return { success: true, remaining, paidPercentage };
    } catch (error) {
        logger.error('Error in setBookedPlotAmounts:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to set booked plot amounts');
    }
}
