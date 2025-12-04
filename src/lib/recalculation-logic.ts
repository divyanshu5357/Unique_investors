// NEW RECALCULATION LOGIC - UPDATE INSTEAD OF DELETE/INSERT
// This preserves all timestamps permanently

import { recalculateCommissionForPlot } from '@/lib/actions';
import { getSupabaseAdminClient } from '@/lib/serverUtils';
import { logger } from '@/lib/utils/logger';

export async function recalculateCommissionForPlotNew(plotId: string) {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        
        logger.dev(`🔄 [NEW LOGIC] Recalculating commission for plot: ${plotId}`);
        
        // Get plot details
        const { data: plot, error: plotError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .eq('id', plotId)
            .single();

        if (plotError || !plot) throw new Error('Plot not found');
        if (plot.status !== 'sold') throw new Error('Plot is not sold yet');

        const brokerId = plot.broker_id || plot.updated_by;
        const saleAmount = plot.total_plot_amount || plot.sale_price;
        
        if (!brokerId) throw new Error('No broker information found');
        if (!saleAmount) throw new Error('No sale amount found');

        logger.dev(`📊 Plot: ${plot.project_name} #${plot.plot_number}, Amount: ₹${saleAmount}`);

        // STEP 1: Fetch existing commissions (DON'T DELETE THEM)
        const { data: existingCommissions } = await supabaseAdmin
            .from('commissions')
            .select('*')
            .eq('plot_id', plot.id);

        // STEP 2: Fetch existing transactions for timestamp preservation
        const { data: existingTransactions } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('plot_id', plot.id);

        // Build reference maps
        const commissionMap = new Map();
        const txTimestamps = new Map();
        
        if (existingCommissions) {
            for (const comm of existingCommissions) {
                const key = `${comm.receiver_id}_${comm.level}`;
                commissionMap.set(key, {
                    id: comm.id,
                    created_at: comm.created_at,
                    oldAmount: comm.amount
                });
                
                // Subtract old amount from wallet
                const { data: wallet } = await supabaseAdmin
                    .from('wallets')
                    .select('*')
                    .eq('owner_id', comm.receiver_id)
                    .single();

                if (wallet) {
                    const field = comm.level === 1 ? 'direct_sale_balance' : 'downline_sale_balance';
                    await supabaseAdmin
                        .from('wallets')
                        .update({
                            [field]: Math.max(0, (wallet[field] || 0) - comm.amount),
                            total_balance: Math.max(0, (wallet.total_balance || 0) - comm.amount),
                        })
                        .eq('owner_id', comm.receiver_id);
                }
            }
        }
        
        if (existingTransactions) {
            for (const tx of existingTransactions) {
                const level = tx.wallet_type === 'direct' ? 1 : parseInt((tx.description.match(/Level (\d+)/) || [0, '2'])[1]);
                const key = `${tx.wallet_id}_${level}`;
                txTimestamps.set(key, tx.created_at);
            }
        }

        // STEP 3: Delete transactions only (will be recreated with preserved timestamps)
        await supabaseAdmin
            .from('transactions')
            .delete()
            .eq('plot_id', plot.id);

        // STEP 4: Recalculate - this will UPDATE existing commissions, INSERT missing ones
        const result = await processCommissionCalculationWithUpdate(
            brokerId,
            saleAmount,
            {
                id: plot.id,
                projectName: plot.project_name,
                plotNumber: plot.plot_number,
                commissionRate: plot.commission_rate || 6,
            },
            {
                commissionMap,
                transactionTimestamps: txTimestamps
            }
        );

        logger.dev(`✅ Recalculation complete - timestamps preserved`);

        return {
            success: true,
            message: `Commission recalculated for plot ${plot.plot_number}`,
            result
        };

    } catch (error) {
        logger.error('❌ Recalculation error:', error);
        return {
            success: false,
            message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

// Modified commission calculation that UPDATES instead of INSERT
async function processCommissionCalculationWithUpdate(
    sellerId: string,
    saleAmount: number,
    plotData: any,
    preservedData: {
        commissionMap: Map<string, any>;
        transactionTimestamps: Map<string, string>;
    }
) {
    const supabaseAdmin = getSupabaseAdminClient();
    
    // Get seller profile
    const { data: sellerProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, uplineId')
        .eq('id', sellerId)
        .single();

    if (!sellerProfile) throw new Error('Seller profile not found');

    const commissionRates = { direct: 6, 1: 2, 2: 0.5 };
    const plotCommissionRate = plotData.commissionRate || commissionRates.direct;
    const sellerDirectCommission = (saleAmount * plotCommissionRate) / 100;

    // Update seller wallet
    await supabaseAdmin.rpc('upsert_seller_commission', {
        seller_id: sellerId,
        seller_name: sellerProfile.full_name || 'Unknown',
        commission_amount: sellerDirectCommission,
        p_plot_number: plotData.plotNumber?.toString() || null,
        p_project_name: plotData.projectName || null
    });

    // Create or update seller transaction with preserved timestamp
    const sellerTxKey = `${sellerId}_1`;
    const sellerTimestamp = preservedData.transactionTimestamps.get(sellerTxKey);
    
    const sellerTxData: any = {
        wallet_id: sellerId,
        wallet_type: 'direct',
        type: 'credit',
        amount: sellerDirectCommission,
        description: `Direct sale from plot #${plotData.plotNumber} - ${plotData.projectName}`,
        status: 'completed',
        plot_id: plotData.id,
        project_name: plotData.projectName,
    };
    
    if (sellerTimestamp) {
        sellerTxData.created_at = sellerTimestamp;
        logger.dev(`   📅 Preserving seller transaction timestamp: ${sellerTimestamp}`);
    }
    
    await supabaseAdmin.from('transactions').insert(sellerTxData);

    // Process upline commissions
    let currentUplineId = sellerProfile.uplineId;
    let level = 1;

    while (currentUplineId && level <= 2) {
        const { data: uplineProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, uplineId')
            .eq('id', currentUplineId)
            .single();

        if (!uplineProfile) break;

        const percentage = commissionRates[level as 1 | 2];
        const commissionAmount = (saleAmount * percentage) / 100;

        // Check if commission exists
        const commKey = `${uplineProfile.id}_${level}`;
        const existingComm = preservedData.commissionMap.get(commKey);

        if (existingComm) {
            // UPDATE existing commission (created_at is protected by trigger)
            await supabaseAdmin
                .from('commissions')
                .update({
                    amount: commissionAmount,
                    percentage: percentage,
                    sale_amount: saleAmount,
                    seller_name: sellerProfile.full_name,
                    receiver_name: uplineProfile.full_name,
                })
                .eq('id', existingComm.id);
            
            logger.dev(`   ✏️  UPDATED commission for ${uplineProfile.full_name} (Level ${level})`);
        } else {
            // INSERT new commission
            await supabaseAdmin
                .from('commissions')
                .insert({
                    sale_id: plotData.id,
                    seller_id: sellerId,
                    seller_name: sellerProfile.full_name,
                    receiver_id: uplineProfile.id,
                    receiver_name: uplineProfile.full_name,
                    level: level,
                    amount: commissionAmount,
                    percentage: percentage,
                    sale_amount: saleAmount,
                    plot_id: plotData.id,
                    project_name: plotData.projectName,
                });
            
            logger.dev(`   ➕ INSERTED new commission for ${uplineProfile.full_name} (Level ${level})`);
        }

        // Update wallet
        await supabaseAdmin.rpc('upsert_upline_commission', {
            upline_id: uplineProfile.id,
            upline_name: uplineProfile.full_name,
            commission_amount: commissionAmount,
            p_seller_name: sellerProfile.full_name,
            p_plot_number: plotData.plotNumber?.toString() || null,
            p_project_name: plotData.projectName || null,
            commission_level: level
        });

        // Create transaction with preserved timestamp
        const txKey = `${uplineProfile.id}_${level}`;
        const txTimestamp = preservedData.transactionTimestamps.get(txKey);
        
        const txData: any = {
            wallet_id: uplineProfile.id,
            wallet_type: 'downline',
            type: 'credit',
            amount: commissionAmount,
            description: `Downline sale from plot #${plotData.plotNumber} - ${plotData.projectName}`,
            status: 'completed',
            plot_id: plotData.id,
            project_name: plotData.projectName,
        };
        
        if (txTimestamp) {
            txData.created_at = txTimestamp;
            logger.dev(`   📅 Preserving upline transaction timestamp: ${txTimestamp}`);
        }
        
        await supabaseAdmin.from('transactions').insert(txData);

        currentUplineId = uplineProfile.uplineId;
        level++;
    }

    return { success: true };
}
