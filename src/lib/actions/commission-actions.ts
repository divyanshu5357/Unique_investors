'use server'

import { z } from 'zod';
import { logger } from '../utils/logger';
import { GAJ_COMMISSION_RATES, calculateCommission } from '../commissionConfig';
import { 
    getSupabaseAdminClient,
    getAuthenticatedUser,
    authorizeAdmin
} from '../serverUtils';
import { revalidatePath } from 'next/cache';

// Commission update schema
const CommissionUpdateSchema = z.object({
    plotId: z.string().min(1, "Plot ID is required"),
    commissionRate: z.number().min(0).max(100, "Commission rate must be between 0 and 100"),
    salePrice: z.number().min(0, "Sale price must be non-negative"),
});

export async function updateCommission(plotId: string, commissionRate: number, salePrice: number) {
    try {
        const validatedData = CommissionUpdateSchema.parse({
            plotId,
            commissionRate,
            salePrice
        });

        await authorizeAdmin();
        const supabaseAdmin = getSupabaseAdminClient();

        const { data: existingPlot, error: fetchError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .eq('id', validatedData.plotId)
            .single();
        
        if (fetchError || !existingPlot) {
            throw new Error('Plot not found');
        }

        const { error: updateError } = await supabaseAdmin
            .from('plots')
            .update({
                sale_price: validatedData.salePrice,
            })
            .eq('id', validatedData.plotId);

        if (updateError) {
            throw new Error(`Failed to update plot: ${updateError.message}`);
        }

        revalidatePath('/admin/commissions');
        
        return { 
            success: true, 
            message: 'Commission updated successfully',
            newCommissionAmount: (validatedData.salePrice * validatedData.commissionRate) / 100
        };

    } catch (error) {
        logger.error("Error updating commission:", error);
        if (error instanceof z.ZodError) {
            throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw new Error("Failed to update commission");
    }
}

export async function processCommissionCalculation(
    sellerId: string, 
    saleAmount: number, 
    plotData?: any,
    preservedTimestamps?: Map<string, string>
) {
    try {
        if (!sellerId || typeof sellerId !== 'string') {
            throw new Error('Invalid seller ID provided');
        }
        if (!saleAmount || typeof saleAmount !== 'number' || isNaN(saleAmount) || saleAmount <= 0) {
            throw new Error('Invalid sale amount provided. Must be a positive number.');
        }

        const supabaseAdmin = getSupabaseAdminClient();
        
        if (plotData?.id && !preservedTimestamps) {
            const { data: existingCommissions, error: checkError } = await supabaseAdmin
                .from('commissions')
                .select('id')
                .eq('plot_id', plotData.id)
                .eq('seller_id', sellerId)
                .limit(1);
            
            if (checkError) {
                logger.error('Error checking for existing commissions:', checkError);
            } else if (existingCommissions && existingCommissions.length > 0) {
                logger.dev(`⏭️  Commission already exists for plot ${plotData.plotNumber} - skipping duplicate calculation`);
                return {
                    success: true,
                    message: 'Commission already calculated for this plot',
                    commissionsGenerated: 0,
                    totalDistributed: 0
                };
            }
        }
        
        logger.dev('Looking for seller profile with ID:', sellerId);
        
        let sellerProfile;
        let profileError = null;
        
        try {
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('full_name, "uplineId", role')
                .eq('id', sellerId)
                .single();
            sellerProfile = data;
            profileError = error;
        } catch (err) {
            logger.dev('uplineId column not found, trying without it...');
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('full_name, role')
                .eq('id', sellerId)
                .single();
            sellerProfile = data;
            profileError = error;
        }
            
        if (profileError || !sellerProfile) {
            logger.error('Error fetching seller profile:', profileError);
            throw new Error(`Seller profile not found for ID: ${sellerId}. Please ensure the broker exists in the system.`);
        }
        
        logger.dev('Found seller profile:', { 
            name: sellerProfile.full_name, 
            role: sellerProfile.role, 
            hasUpline: !!(sellerProfile as any).uplineId 
        });
        
        const commissions = [];
        let currentUplineId = (sellerProfile as any).uplineId || null;
        let level = 1;
        
        if (!currentUplineId) {
            logger.dev('No upline structure found, processing only direct commission for seller.');
        }
        
        const plotSizeInGaj = saleAmount;
        const sellerDirectCommission = calculateCommission('direct', plotSizeInGaj);
        
        logger.dev(`💰 Calculating seller commission (GAJ-BASED): ${plotSizeInGaj} gaj × ₹${GAJ_COMMISSION_RATES.direct}/gaj = ₹${sellerDirectCommission}`);
        
        const { error: sellerWalletError } = await supabaseAdmin.rpc('upsert_seller_commission', {
            seller_id: sellerId,
            seller_name: sellerProfile.full_name || 'Unknown',
            commission_amount: sellerDirectCommission,
            p_plot_number: plotData?.plotNumber?.toString() || null,
            p_project_name: plotData?.projectName || null
        });

        if (sellerWalletError) {
            logger.error('Failed to update seller wallet via RPC:', sellerWalletError.message);
            logger.dev('Trying direct wallet update...');
            
            const { data: existingWallet } = await supabaseAdmin
                .from('wallets')
                .select('*')
                .eq('owner_id', sellerId)
                .single();
            
            const newDirectBalance = (existingWallet?.direct_sale_balance || 0) + sellerDirectCommission;
            const newTotalBalance = (existingWallet?.total_balance || 0) + sellerDirectCommission;
            
            const { error: upsertError } = await supabaseAdmin
                .from('wallets')
                .upsert({
                    owner_id: sellerId,
                    owner_name: sellerProfile.full_name || 'Unknown',
                    direct_sale_balance: newDirectBalance,
                    downline_sale_balance: existingWallet?.downline_sale_balance || 0,
                    total_balance: newTotalBalance,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'owner_id'
                });
            
            if (upsertError) {
                throw new Error(`Failed to update seller wallet: ${upsertError.message}`);
            }
            logger.dev(`✅ Updated wallet for seller: ${sellerId} - Added ₹${sellerDirectCommission}`);
        } else {
            logger.dev(`✅ Seller wallet updated via RPC - Added ₹${sellerDirectCommission}`);
        }

        const sellerTimestampKey = `${sellerId}_1`;
        const preservedSellerTimestamp = preservedTimestamps?.get(sellerTimestampKey);
        
        const sellerTransactionData: any = {
            wallet_id: sellerId,
            wallet_type: 'direct',
            type: 'credit',
            amount: sellerDirectCommission,
            description: `Direct sale from plot #${plotData?.plotNumber} - ${plotData?.projectName}`,
            status: 'completed',
            plot_id: plotData?.id || null,
            project_name: plotData?.projectName || null,
        };

        if (preservedTimestamps) {
            const { data: existingSellerTx } = await supabaseAdmin
                .from('transactions')
                .select('id, created_at')
                .eq('plot_id', plotData?.id || '')
                .eq('wallet_id', sellerId)
                .eq('wallet_type', 'direct')
                .limit(1)
                .maybeSingle();

            if (existingSellerTx) {
                const { error: updateTxError } = await supabaseAdmin
                    .from('transactions')
                    .update({
                        amount: sellerDirectCommission,
                        description: `Direct sale from plot #${plotData?.plotNumber} - ${plotData?.projectName}`,
                        status: 'completed',
                        project_name: plotData?.projectName || null,
                        plot_id: plotData?.id || null,
                    })
                    .eq('id', existingSellerTx.id);
                if (updateTxError) {
                    logger.error('Failed to update existing seller transaction:', updateTxError.message);
                } else {
                    logger.dev(`✏️  Updated existing seller transaction (timestamp preserved: ${existingSellerTx.created_at})`);
                }
            } else {
                if (preservedSellerTimestamp) {
                    sellerTransactionData.created_at = preservedSellerTimestamp;
                    logger.dev(`   📅 Using preserved seller transaction timestamp: ${preservedSellerTimestamp}`);
                }
                const { error: insertSellerTxError } = await supabaseAdmin
                    .from('transactions')
                    .insert(sellerTransactionData);
                if (insertSellerTxError) {
                    logger.error('Failed to insert seller transaction during recalculation:', insertSellerTxError.message);
                } else {
                    logger.dev('➕ Inserted new seller transaction (recalculation mode).');
                }
            }
        } else {
            const { data: existingSellerTx } = await supabaseAdmin
                .from('transactions')
                .select('id')
                .eq('plot_id', plotData?.id || '')
                .eq('wallet_id', sellerId)
                .eq('wallet_type', 'direct')
                .limit(1)
                .maybeSingle();
            if (existingSellerTx) {
                logger.dev('↪️ Skipping manual seller transaction insert (RPC already created one).');
            } else {
                const { error: sellerTransactionError } = await supabaseAdmin
                    .from('transactions')
                    .insert(sellerTransactionData);
                if (sellerTransactionError) {
                    logger.error('Transaction creation failed:', sellerTransactionError.message);
                } else {
                    logger.dev(`✅ Transaction record created for seller`);
                }
            }
        }

        while (currentUplineId && level <= 2) {
            let uplineProfile;
            try {
                const { data } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name, "uplineId"')
                    .eq('id', currentUplineId)
                    .single();
                uplineProfile = data;
            } catch (err) {
                const { data } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name')
                    .eq('id', currentUplineId)
                    .single();
                uplineProfile = data;
            }
                
            if (!uplineProfile) break;
            
            let commissionAmount = 0;
            if (level === 1) {
                commissionAmount = calculateCommission('level1', plotSizeInGaj);
                logger.dev(`💰 Level ${level} upline commission: ${plotSizeInGaj} gaj × ₹${GAJ_COMMISSION_RATES.level1}/gaj = ₹${commissionAmount} for ${uplineProfile.full_name}`);
            } else if (level === 2) {
                commissionAmount = calculateCommission('level2', plotSizeInGaj);
                logger.dev(`💰 Level ${level} upline commission: ${plotSizeInGaj} gaj × ₹${GAJ_COMMISSION_RATES.level2}/gaj = ₹${commissionAmount} for ${uplineProfile.full_name}`);
            } else {
                logger.dev(`💰 Level ${level} upline: No commission (only levels 1-2 receive commissions)`);
                break;
            }
            
            const timestampKey = `${uplineProfile.id}_${level}`;
            const preservedTimestamp = preservedTimestamps?.get(timestampKey);
            
            const commissionData: any = {
                sale_id: plotData?.id || `sale_${Date.now()}`,
                seller_id: sellerId,
                seller_name: sellerProfile.full_name || 'Unknown',
                receiver_id: uplineProfile.id,
                receiver_name: uplineProfile.full_name || 'Unknown',
                level: level,
                amount: commissionAmount,
                percentage: null,
                sale_amount: plotSizeInGaj,
                plot_id: plotData?.id || null,
                project_name: plotData?.projectName || null,
            };
            
            if (preservedTimestamp) {
                commissionData.created_at = preservedTimestamp;
                logger.dev(`   📅 Using preserved timestamp: ${preservedTimestamp}`);
            }
            
            if (preservedTimestamps && preservedTimestamp) {
                const { data: existingComm } = await supabaseAdmin
                    .from('commissions')
                    .select('id, created_at')
                    .eq('plot_id', plotData?.id)
                    .eq('receiver_id', uplineProfile.id)
                    .eq('level', level)
                    .single();
                
                if (existingComm) {
                    const { error: updateError } = await supabaseAdmin
                        .from('commissions')
                        .update({
                            amount: commissionAmount,
                            percentage: null,
                            sale_amount: plotSizeInGaj,
                            seller_name: sellerProfile.full_name || 'Unknown',
                            receiver_name: uplineProfile.full_name || 'Unknown',
                        })
                        .eq('id', existingComm.id);
                    
                    if (updateError) {
                        logger.error(`Failed to update commission record for level ${level}:`, updateError.message);
                    } else {
                        logger.dev(`✅ Commission record UPDATED for level ${level} (timestamp preserved)`);
                    }
                } else {
                    const { error: insertError } = await supabaseAdmin
                        .from('commissions')
                        .insert(commissionData);
                    
                    if (insertError) {
                        logger.error(`Failed to insert commission record for level ${level}:`, insertError.message);
                    } else {
                        logger.dev(`✅ Commission record INSERTED for level ${level} with preserved timestamp`);
                    }
                }
            } else {
                const { error: commissionError } = await supabaseAdmin
                    .from('commissions')
                    .insert(commissionData);
                    
                if (commissionError) {
                    logger.error(`Failed to create commission record for level ${level}:`, commissionError.message);
                } else {
                    logger.dev(`✅ Commission record created for level ${level}`);
                }
            }
            
            const { error: uplineWalletError } = await supabaseAdmin.rpc('upsert_upline_commission', {
                upline_id: uplineProfile.id,
                upline_name: uplineProfile.full_name || 'Unknown',
                commission_amount: commissionAmount,
                p_seller_name: sellerProfile.full_name || 'Unknown',
                p_plot_number: plotData?.plotNumber?.toString() || null,
                p_project_name: plotData?.projectName || null,
                commission_level: level
            });

            if (uplineWalletError) {
                logger.error('Failed to update upline wallet via RPC:', uplineWalletError.message);
                logger.dev('Trying direct wallet update...');
                
                const { data: existingWallet } = await supabaseAdmin
                    .from('wallets')
                    .select('*')
                    .eq('owner_id', uplineProfile.id)
                    .single();
                
                const newDownlineBalance = (existingWallet?.downline_sale_balance || 0) + commissionAmount;
                const newTotalBalance = (existingWallet?.total_balance || 0) + commissionAmount;
                
                const { error: upsertError } = await supabaseAdmin
                    .from('wallets')
                    .upsert({
                        owner_id: uplineProfile.id,
                        owner_name: uplineProfile.full_name || 'Unknown',
                        direct_sale_balance: existingWallet?.direct_sale_balance || 0,
                        downline_sale_balance: newDownlineBalance,
                        total_balance: newTotalBalance,
                        updated_at: new Date().toISOString(),
                    }, {
                        onConflict: 'owner_id'
                    });
                
                if (upsertError) {
                    logger.error(`Failed to update upline wallet: ${upsertError.message}`);
                } else {
                    logger.dev(`✅ Upline wallet updated - Added ₹${commissionAmount} to downline balance`);
                }
            } else {
                logger.dev(`✅ Upline wallet updated via RPC - Added ₹${commissionAmount}`);
            }
            
            const uplineTimestampKey = `${uplineProfile.id}_${level}`;
            const preservedUplineTimestamp = preservedTimestamps?.get(uplineTimestampKey);
            
            const uplineTransactionData: any = {
                wallet_id: uplineProfile.id,
                wallet_type: 'downline',
                type: 'credit',
                amount: commissionAmount,
                description: `Downline sale from plot #${plotData?.plotNumber} - ${plotData?.projectName}`,
                status: 'completed',
                plot_id: plotData?.id || null,
                project_name: plotData?.projectName || null,
            };
            if (preservedTimestamps) {
                const { data: existingUplineTx } = await supabaseAdmin
                    .from('transactions')
                    .select('id, created_at')
                    .eq('plot_id', plotData?.id || '')
                    .eq('wallet_id', uplineProfile.id)
                    .eq('wallet_type', 'downline')
                    .limit(1)
                    .maybeSingle();

                if (existingUplineTx) {
                    const { error: updateUplineTxError } = await supabaseAdmin
                        .from('transactions')
                        .update({
                            amount: commissionAmount,
                            description: `Downline sale from plot #${plotData?.plotNumber} - ${plotData?.projectName}`,
                            status: 'completed',
                            project_name: plotData?.projectName || null,
                            plot_id: plotData?.id || null,
                        })
                        .eq('id', existingUplineTx.id);
                    if (updateUplineTxError) {
                        logger.error(`Failed to update existing Level ${level} transaction:`, updateUplineTxError.message);
                    } else {
                        logger.dev(`✏️  Updated existing Level ${level} upline transaction (timestamp preserved: ${existingUplineTx.created_at})`);
                    }
                } else {
                    if (preservedUplineTimestamp) {
                        uplineTransactionData.created_at = preservedUplineTimestamp;
                        logger.dev(`   📅 Using preserved upline transaction timestamp: ${preservedUplineTimestamp}`);
                    }
                    uplineTransactionData.description = `Downline sale from plot #${plotData?.plotNumber} - ${plotData?.projectName}`;
                    const { error: insertUplineTxError } = await supabaseAdmin
                        .from('transactions')
                        .insert(uplineTransactionData);
                    if (insertUplineTxError) {
                        logger.error(`Failed to insert Level ${level} upline transaction during recalculation:`, insertUplineTxError.message);
                    } else {
                        logger.dev(`➕ Inserted new Level ${level} upline transaction (recalculation mode).`);
                    }
                }
            } else {
                const { data: existingUplineTx } = await supabaseAdmin
                    .from('transactions')
                    .select('id')
                    .eq('plot_id', plotData?.id || '')
                    .eq('wallet_id', uplineProfile.id)
                    .eq('wallet_type', 'downline')
                    .limit(1)
                    .maybeSingle();
                if (existingUplineTx) {
                    logger.dev(`↪️ Skipping manual Level ${level} upline transaction insert (RPC already created one).`);
                } else {
                    if (preservedUplineTimestamp) {
                        uplineTransactionData.created_at = preservedUplineTimestamp;
                        logger.dev(`   📅 Using preserved upline transaction timestamp: ${preservedUplineTimestamp}`);
                    }
                    uplineTransactionData.description = `Downline sale from plot #${plotData?.plotNumber} - ${plotData?.projectName}`;
                    const { error: uplineTransactionError } = await supabaseAdmin
                        .from('transactions')
                        .insert(uplineTransactionData);
                    if (uplineTransactionError) {
                        logger.error('Upline transaction creation failed:', uplineTransactionError.message);
                    } else {
                        logger.dev(`✅ Transaction record created for upline level ${level}`);
                    }
                }
            }
            
            commissions.push(commissionData);
            
            currentUplineId = (uplineProfile as any).uplineId;
            level++;
        }
        
        const totalDistributed = sellerDirectCommission + commissions.reduce((sum, c) => sum + c.amount, 0);
        
        logger.dev('\n🎉 Commission Distribution Summary (GAJ-BASED):');
        logger.dev(`   Plot Size: ${plotSizeInGaj} gaj`);
        logger.dev(`   Seller Direct Commission: ₹${sellerDirectCommission} (₹${GAJ_COMMISSION_RATES.direct}/gaj)`);
        logger.dev(`   Upline Commissions (${commissions.length} levels): ₹${commissions.reduce((sum, c) => sum + c.amount, 0)}`);
        logger.dev(`   Total Distributed: ₹${totalDistributed}`);
        
        return {
            success: true,
            commissionsGenerated: commissions.length,
            totalDistributed: totalDistributed,
            sellerCommission: sellerDirectCommission,
            uplineCommissions: commissions.reduce((sum, c) => sum + c.amount, 0)
        };
        
    } catch (error) {
        logger.error('❌ Error processing commission calculation:', error);
        return {
            success: false,
            error: (error as Error).message,
            commissionsGenerated: 0,
            totalDistributed: 0
        };
    }
}

export async function getBrokerCommissions(brokerId?: string) {
    const user = await getAuthenticatedUser();
    const supabaseAdmin = getSupabaseAdminClient();
    
    try {
        let query = supabaseAdmin.from('commissions').select('*');
        
        if (brokerId) {
            query = query.eq('receiver_id', brokerId);
        }
        
        const { data: commissions, error } = await query
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            throw new Error(`Failed to fetch commissions: ${error.message}`);
        }

        return commissions || [];
        
    } catch (error) {
        logger.error('Error fetching commissions:', error);
        return [];
    }
}

export async function calculateCommissionForSoldPlots() {
    try {
        await authorizeAdmin();
        const supabaseAdmin = getSupabaseAdminClient();
        
        logger.dev('🔍 Starting commission recalculation for sold plots...');
        logger.dev('⚠️ This will clear all existing commissions and recalculate from scratch');
        
        const { error: deleteCommissionsError } = await supabaseAdmin
            .from('commissions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteCommissionsError) {
            console.warn('Warning: Could not delete existing commissions:', deleteCommissionsError.message);
        }
        
        const { error: deleteTransactionsError } = await supabaseAdmin
            .from('transactions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteTransactionsError) {
            console.warn('Warning: Could not delete existing transactions:', deleteTransactionsError.message);
        }
        
        const { error: resetWalletsError } = await supabaseAdmin
            .from('wallets')
            .update({
                direct_sale_balance: 0,
                downline_sale_balance: 0,
                total_balance: 0,
                updated_at: new Date().toISOString()
            })
            .neq('owner_id', '00000000-0000-0000-0000-000000000000');
        
        if (resetWalletsError) {
            console.warn('Warning: Could not reset wallets:', resetWalletsError.message);
        }
        
        logger.dev('✅ Cleared existing data, starting fresh calculation...');
        
        const { data: soldPlots, error: plotError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .eq('status', 'sold');

        if (plotError) {
            throw new Error(`Failed to fetch sold plots: ${plotError.message}`);
        }

        if (!soldPlots || soldPlots.length === 0) {
            logger.dev('❌ No sold plots found');
            return { success: false, message: 'No sold plots found' };
        }

        const plotsWithBroker = soldPlots.filter(plot => plot.broker_id || plot.updated_by);
        
        logger.dev(`📊 Found ${soldPlots.length} sold plots, ${plotsWithBroker.length} have broker information`);
        let processedCount = 0;
        let totalCommissionDistributed = 0;

        for (const plot of plotsWithBroker) {
            try {
                const brokerId = plot.broker_id || plot.updated_by;
                const plotSizeInGaj = plot.area || 0;
                
                logger.dev(`\n Processing plot ${plot.plot_number} (${plot.project_name})`);
                logger.dev(`   Plot Size: ${plotSizeInGaj} gaj`);
                logger.dev(`   Broker ID: ${brokerId}`);

                const result = await processCommissionCalculation(
                    brokerId,
                    plotSizeInGaj,
                    {
                        id: plot.id,
                        projectName: plot.project_name,
                        plotNumber: plot.plot_number
                    }
                );

                logger.dev(`   Commission calculated for plot ${plot.plot_number}`);
                processedCount++;
                const totalCommissions = 
                    calculateCommission('direct', plotSizeInGaj) +
                    calculateCommission('level1', plotSizeInGaj) +
                    calculateCommission('level2', plotSizeInGaj);
                totalCommissionDistributed += totalCommissions;

            } catch (plotError) {
                logger.error(`Error processing plot ${plot.plot_number}:`, plotError);
            }
        }

        logger.dev(`\n🎉 Commission calculation complete!`);
        logger.dev(`   Plots processed: ${processedCount}/${plotsWithBroker.length}`);
        logger.dev(`   Total commission distributed: ₹${totalCommissionDistributed.toFixed(2)}`);

        revalidatePath('/admin/associates');
        revalidatePath('/admin/brokers');
        revalidatePath('/admin/dashboard');
        revalidatePath('/admin/commissions');
        revalidatePath('/broker/dashboard');
        revalidatePath('/broker/wallets');

        return {
            success: true,
            message: `Successfully processed ${processedCount} plots. Total commission distributed: ₹${totalCommissionDistributed.toFixed(2)}`,
            plotsProcessed: processedCount,
            totalCommission: totalCommissionDistributed
        };

    } catch (error) {
        logger.error('❌ Error in calculateCommissionForSoldPlots:', error);
        return {
            success: false,
            message: `Failed to calculate commissions: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

export async function recalculateCommissionForPlot(plotId: string) {
    try {
        await authorizeAdmin();
        const supabaseAdmin = getSupabaseAdminClient();
        
        logger.dev(`🔄 Recalculating commission for plot: ${plotId}`);
        
        const { data: plot, error: plotError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .eq('id', plotId)
            .single();

        if (plotError || !plot) {
            throw new Error('Plot not found');
        }

        if (plot.status !== 'sold') {
            throw new Error('Plot is not sold yet');
        }

        const brokerId = plot.broker_id || plot.updated_by;
        
        if (!brokerId) {
            throw new Error('No broker information found for this plot');
        }

        const plotSizeInGaj = plot.area || 0;
        
        if (!plotSizeInGaj || plotSizeInGaj <= 0) {
            throw new Error('No plot area (gaj) found for this plot');
        }

        logger.dev(`📊 Plot Details:`);
        logger.dev(`   Project: ${plot.project_name}`);
        logger.dev(`   Plot #: ${plot.plot_number}`);
        logger.dev(`   Plot Size: ${plotSizeInGaj} gaj`);
        logger.dev(`   Broker ID: ${brokerId}`);

        logger.dev(`📝 Fetching existing commissions for plot ${plot.plot_number}...`);
        
        const { data: existingCommissions } = await supabaseAdmin
            .from('commissions')
            .select('*')
            .eq('plot_id', plot.id)
            .order('level', { ascending: true });

        const { data: existingTransactions } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('plot_id', plot.id)
            .order('created_at', { ascending: true });

        const originalTimestamps = new Map();
        const originalIds = new Map();
        
        if (existingCommissions && existingCommissions.length > 0) {
            logger.dev(`📝 Found ${existingCommissions.length} existing commissions - preserving timestamps`);
            for (const comm of existingCommissions) {
                const key = `${comm.receiver_id}_${comm.level}`;
                originalTimestamps.set(key, comm.created_at);
                originalIds.set(key, comm.id);
            }
        }
        
        if (existingTransactions && existingTransactions.length > 0) {
            logger.dev(`📝 Found ${existingTransactions.length} existing transactions - preserving timestamps`);
            for (const tx of existingTransactions) {
                const level = tx.wallet_type === 'direct' ? 1 : (tx.description.match(/Level (\d+)/) || [0, 2])[1];
                const key = `${tx.wallet_id}_${level}`;
                if (!originalTimestamps.has(key)) {
                    originalTimestamps.set(key, tx.created_at);
                }
            }
        }

        if (existingCommissions && existingCommissions.length > 0) {
            logger.dev(`📉 Adjusting wallet balances...`);
            for (const comm of existingCommissions) {
                const { data: wallet } = await supabaseAdmin
                    .from('wallets')
                    .select('*')
                    .eq('owner_id', comm.receiver_id)
                    .single();

                if (wallet) {
                    const balanceField = comm.level === 1 ? 'direct_sale_balance' : 'downline_sale_balance';
                    const newBalance = Math.max(0, (wallet[balanceField] || 0) - comm.amount);
                    const newTotal = Math.max(0, (wallet.total_balance || 0) - comm.amount);

                    await supabaseAdmin
                        .from('wallets')
                        .update({
                            [balanceField]: newBalance,
                            total_balance: newTotal,
                            updated_at: new Date().toISOString()
                        })
                        .eq('owner_id', comm.receiver_id);
                }
            }
        }

        logger.dev(`🔐 Preserving existing commission & transaction timestamps (no deletion).`);

        const result = await processCommissionCalculation(
            brokerId,
            plotSizeInGaj,
            {
                id: plot.id,
                projectName: plot.project_name,
                plotNumber: plot.plot_number
            },
            originalTimestamps
        );

        logger.dev(`Commission recalculation complete`);

        revalidatePath('/admin/associates');
        revalidatePath('/admin/brokers');
        revalidatePath('/admin/dashboard');
        revalidatePath('/admin/commissions');
        revalidatePath('/broker/dashboard');
        revalidatePath('/broker/wallets');

        return {
            success: true,
            message: `Commission recalculated successfully for plot ${plot.plot_number}`,
            result
        };

    } catch (error) {
        logger.error('❌ Error recalculating commission:', error);
        return {
            success: false,
            message: `Failed to recalculate commission: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}
