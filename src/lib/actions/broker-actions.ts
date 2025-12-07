// ========== PHASE 2: BROKER MANAGEMENT ACTIONS ==========
// Functions for broker CRUD operations, profiles, and history

'use server'

import type { Broker, DownlineTreeData, BrokerHistoryRecord } from '@/lib/types';
import { z } from 'zod';
import { BrokerFormSchema, authorizeAdmin, getAuthenticatedUser, getSupabaseAdminClient, buildDownlineTree } from '@/lib/serverUtils';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/utils/logger';

// ========== BROKER CRUD OPERATIONS ==========

export async function createBroker(values: z.infer<typeof BrokerFormSchema> & Partial<import('@/lib/types').BrokerReferralRecord>) {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
        user_metadata: {
            full_name: values.fullName,
            role: 'broker',
        }
    });

    if (authError) {
        logger.error("Supabase create user failed:", authError);
        throw new Error(`Could not create broker user: ${authError.message}`);
    }

    if (!authData.user) {
        throw new Error('Could not create broker user.');
    }

    const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
        authData.user.id,
        { email_confirm: true }
    );

    if (updateUserError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Could not confirm broker's email: ${updateUserError.message}. The operation has been rolled back.`);
    }

    const profileData = {
        id: authData.user.id,
        email: values.email || values.referredEmail || null,
        phone: values.referredPhone || null,
        name: values.fullName || values.referredName || null,
        full_name: values.fullName || values.referredName || null,
        role: 'broker',
        status: 'approved',
        commission: 0,
        totalsales: 0,
        joinedat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sponsorid: values.uplineId || values.referrerId || null,
        referred_by: values.uplineId || values.referrerId || null,
        uplineId: values.uplineId || values.referrerId || null,
        upline_name: values.referrerName || null,
        mobile_number: values.referredPhone || null,
        address: null,
        profile_completed: false,
    };

    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

    if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`User created but failed to create/ensure profile: ${profileError.message}. The operation has been rolled back.`);
    }
    
    const { error: walletError } = await supabaseAdmin
        .from('wallets')
        .insert({
            owner_id: authData.user.id,
            direct_sale_balance: 0,
            downline_sale_balance: 0,
            total_balance: 0
        });

    if (walletError) {
        logger.dev('Wallet may already exist or will be created on first access:', walletError.message);
    }

    revalidatePath('/admin/brokers');
    revalidatePath('/admin/associates');
    return { success: true };
}

export async function getBrokers(): Promise<Broker[]> {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, deleted_at')
        .eq('role', 'broker')
        .is('deleted_at', null);

    if (profileError) throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    if (!profiles) return [];

    const userIds = profiles.map(p => p.id);
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) throw new Error(`Failed to fetch auth users: ${usersError.message}`);
    
    const { data: wallets, error: walletsError } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .in('owner_id', userIds.length > 0 ? userIds : ['dummy-id-to-prevent-error']);

    if (walletsError) {
        logger.dev('Error fetching wallets:', walletsError.message);
    }

    const walletsMap = new Map(
        (wallets || []).map(w => [w.owner_id, {
            directSaleBalance: w.direct_sale_balance,
            downlineSaleBalance: w.downline_sale_balance,
            totalBalance: w.total_balance
        }])
    );

    const brokerUsers = usersData.users.filter(u => userIds.includes(u.id));

    const combinedData: Broker[] = profiles.map(profile => {
        const authUser = brokerUsers.find(u => u.id === profile.id);
        const wallet = walletsMap.get(profile.id);
        return {
            id: profile.id,
            full_name: profile.full_name,
            email: authUser?.email || profile.email,
            created_at: authUser?.created_at || '',
            soldPlots: [],
            directSaleBalance: wallet?.directSaleBalance ?? 0,
            downlineSaleBalance: wallet?.downlineSaleBalance ?? 0,
            totalBalance: wallet?.totalBalance ?? 0,
        };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const brokersWithPlots = await Promise.all(combinedData.map(async (broker) => {
        const { data: soldPlots, error: plotsError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .eq('status', 'sold')
            .or(`broker_id.eq.${broker.id},updated_by.eq.${broker.id}`);

        if (plotsError) {
            logger.dev(`Error fetching plots for broker ${broker.id}:`, plotsError.message);
        }

        const soldPlotsFormatted = (soldPlots || []).map(plot => ({
            id: plot.id,
            projectName: plot.project_name,
            plotNumber: plot.plot_number,
            buyerName: plot.buyer_name,
            salePrice: plot.sale_price,
            status: plot.status,
            createdAt: plot.created_at,
            updatedAt: plot.updated_at,
        }));

        const { data: downlineMembers, error: downlineError } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact', head: false })
            .eq('sponsorid', broker.id);

        if (downlineError) {
            logger.dev(`Error fetching downline for broker ${broker.id}:`, downlineError.message);
        }

        const downlineMemberCount = downlineMembers?.length || 0;

        return { ...broker, soldPlots: soldPlotsFormatted, downlineMemberCount };
    }));

    return brokersWithPlots;
}

export async function deleteBroker(userId: string) {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: profile, error: profileFetchError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .eq('id', userId)
        .single();
    if (profileFetchError || !profile) {
        throw new Error('Profile not found or could not be loaded.');
    }

    const { data: wallet, error: walletLoadError } = await supabaseAdmin
        .from('wallets')
        .select('direct_sale_balance, downline_sale_balance, total_balance')
        .eq('owner_id', userId)
        .single();
    if (walletLoadError && walletLoadError.code !== 'PGRST116') {
        throw new Error(`Could not load wallet: ${walletLoadError.message}`);
    }

    const directBalance = wallet?.direct_sale_balance ?? 0;
    const downlineBalance = wallet?.downline_sale_balance ?? 0;
    const totalBalance = wallet?.total_balance ?? (directBalance + downlineBalance);

    if (directBalance !== 0 || downlineBalance !== 0 || totalBalance !== 0) {
        throw new Error('Cannot delete: broker has non-zero wallet balances. Settle balances first.');
    }

    const { data: soldPlots, error: plotsError } = await supabaseAdmin
        .from('plots')
        .select('id')
        .eq('status', 'sold')
        .or(`broker_id.eq.${userId},updated_by.eq.${userId}`)
        .limit(1);
    if (plotsError) {
        throw new Error(`Could not verify sold plots: ${plotsError.message}`);
    }
    if (soldPlots && soldPlots.length > 0) {
        throw new Error('Cannot delete: broker has sold plots. Reassign or archive plots first.');
    }

    const { data: downline, error: downlineError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('sponsorid', userId)
        .limit(1);
    if (downlineError) {
        throw new Error(`Could not verify downline: ${downlineError.message}`);
    }
    if (downline && downline.length > 0) {
        throw new Error('Cannot delete: broker has downline members. Reassign or remove downline first.');
    }

    const { data: commTx, error: commTxError } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('wallet_id', userId)
        .eq('type', 'commission')
        .limit(1);
    if (commTxError) {
        throw new Error(`Could not verify commission transactions: ${commTxError.message}`);
    }
    if (commTx && commTx.length > 0) {
        throw new Error('Cannot delete: broker has commission transactions. Reverse or archive commissions first.');
    }

    const { error: softDeleteError } = await supabaseAdmin.rpc('safe_delete_profile', { p_profile_id: userId });
    if (softDeleteError) {
        throw new Error(`Soft delete failed: ${softDeleteError.message}`);
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError && !authError.message.includes('User not found')) {
        logger.dev('Auth delete warning:', authError.message);
    }

    const { error: walletDeleteError } = await supabaseAdmin
        .from('wallets')
        .delete()
        .eq('owner_id', userId);
    if (walletDeleteError && walletDeleteError.code !== 'PGRST116') {
        logger.dev('Wallet delete warning:', walletDeleteError.message);
    }

    revalidatePath('/admin/brokers');
    revalidatePath('/admin/associates');
    return { success: true, deleted: true };
}

// ========== BROKER HIERARCHY & HISTORY ==========

export async function getDownlineTreeForBroker(brokerId: string): Promise<DownlineTreeData | null> {
    await authorizeAdmin(); 
    return buildDownlineTree(brokerId);
}

export async function getMyDownlineTree(): Promise<DownlineTreeData | null> {
    const { user } = await getAuthenticatedUser('broker');
    return buildDownlineTree(user.id);
}

export async function getBrokerHistory(options: { brokerId?: string; action?: string; limit?: number } = {}): Promise<BrokerHistoryRecord[]> {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    let query = supabaseAdmin.from('broker_history').select('*').order('occurred_at', { ascending: false });
    if (options.brokerId) query = query.eq('broker_id', options.brokerId);
    if (options.action) query = query.eq('action', options.action);
    if (options.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch broker history: ${error.message}`);
    return (data || []) as BrokerHistoryRecord[];
}

export async function getBrokerProfile() {
    const { user } = await getAuthenticatedUser('broker');
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, totalcommission, uplineId, mobile_number, address')
        .eq('id', user.id)
        .single();

    if (error) {
        logger.error('Error fetching broker profile:', error);
        return null;
    }

    let sponsorName = null;
    if (profile.uplineId) {
        const { data: sponsorData } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', profile.uplineId)
            .single();
        sponsorName = sponsorData?.full_name || null;
    }

    const { data: verificationData } = await supabaseAdmin
        .from('broker_verifications')
        .select('*')
        .eq('broker_id', user.id)
        .order('created_at', { ascending: false });

    return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        totalcommission: profile.totalcommission || 0,
        uplineId: profile.uplineId,
        mobile_number: profile.mobile_number,
        address: profile.address,
        sponsorName: sponsorName,
        verificationApproved: verificationData?.[0]?.status === 'approved',
        verifications: verificationData?.map(v => ({
            status: v.status,
            processed_date: v.processed_at
        })) || [],
    };
}
