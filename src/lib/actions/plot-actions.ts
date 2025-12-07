'use server'

import type { PlotFormValues } from '@/components/inventory/PlotForm';
import { Plot, PlotSchema } from '../schema';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { 
    getSupabaseAdminClient, 
    getAuthenticatedUser, 
    authorizeAdmin,
    BulkAddPlotsData
} from '../serverUtils';
import { PlotHistoryRecord } from '../types';

export async function ensureUserProfile(userId: string, userMetadata?: any) {
    const supabaseAdmin = getSupabaseAdminClient();
    
    const { data: existingProfile, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
    
    if (existingProfile && !checkError) {
        return existingProfile;
    }
    
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authError || !authUser) {
        throw new Error('User not found in authentication system');
    }
    
    const profileData = {
        id: userId,
        full_name: userMetadata?.full_name || authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0] || null,
        avatar_url: userMetadata?.avatar_url || authUser.user.user_metadata?.avatar_url || null,
        role: userMetadata?.role || authUser.user.user_metadata?.role || 'investor'
    };
    
    const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert(profileData)
        .select()
        .single();
    
    if (createError) {
        throw new Error(`Failed to create user profile: ${createError.message}`);
    }
    
    return newProfile;
}

export async function addPlot(data: PlotFormValues) {
    logger.dev('🔵 addPlot called with data:', data);
    await authorizeAdmin();

    const plotNumber = Number(data.plotNumber);
    if (isNaN(plotNumber)) {
        throw new Error('Invalid plot number provided.');
    }

    try {
        const processedData: any = { ...data };
        logger.dev('🔵 processedData before conversion:', processedData);
        
        if (processedData.salePrice !== undefined) {
            processedData.salePrice = typeof processedData.salePrice === 'string' ? 
                parseFloat(processedData.salePrice) : processedData.salePrice;
        }
        if (processedData.commissionRate !== undefined) {
            processedData.commissionRate = typeof processedData.commissionRate === 'string' ? 
                parseFloat(processedData.commissionRate) : processedData.commissionRate;
        }
        if (processedData.soldAmount !== undefined) {
            processedData.soldAmount = typeof processedData.soldAmount === 'string' ? 
                parseFloat(processedData.soldAmount) : processedData.soldAmount;
        }
        if (processedData.area !== undefined) {
            processedData.area = typeof processedData.area === 'string' ? 
                parseFloat(processedData.area) : processedData.area;
        }
        if (processedData.totalPlotAmount !== undefined) {
            processedData.totalPlotAmount = typeof processedData.totalPlotAmount === 'string' ? 
                parseFloat(processedData.totalPlotAmount) : processedData.totalPlotAmount;
        }
        if (processedData.bookingAmount !== undefined) {
            processedData.bookingAmount = typeof processedData.bookingAmount === 'string' ? 
                parseFloat(processedData.bookingAmount) : processedData.bookingAmount;
        }
        if (processedData.tenureMonths !== undefined) {
            processedData.tenureMonths = typeof processedData.tenureMonths === 'string' ? 
                parseInt(processedData.tenureMonths) : processedData.tenureMonths;
        }

        const { user } = await getAuthenticatedUser();
        const supabaseAdmin = getSupabaseAdminClient();

        logger.dev('🟢 processedData after conversion:', {
            totalPlotAmount: processedData.totalPlotAmount,
            bookingAmount: processedData.bookingAmount,
            tenureMonths: processedData.tenureMonths,
            status: processedData.status,
        });

        const plotData = {
            project_name: processedData.projectName,
            type: processedData.type || 'Residential',
            block: processedData.block || 'A',
            plot_number: plotNumber.toString(),
            dimension: processedData.dimension || `${Math.sqrt(processedData.area || 1000).toFixed(0)}x${Math.sqrt(processedData.area || 1000).toFixed(0)} ft`,
            area: processedData.area,
            facing: processedData.facing || 'North',
            status: processedData.status || 'available',
            price: processedData.price || null,
            sale_price: processedData.salePrice || null,
            buyer_name: processedData.buyerName || null,
            buyer_phone: processedData.buyerPhone || null,
            buyer_email: processedData.buyerEmail || null,
            sale_date: processedData.saleDate || null,
            broker_name: processedData.brokerName || null,
            broker_id: processedData.brokerId || null,
            seller_name: processedData.sellerName || null,
            sold_amount: processedData.soldAmount || null,
            commission_rate: processedData.commissionRate || null,
            total_plot_amount: processedData.totalPlotAmount || null,
            booking_amount: processedData.bookingAmount || null,
            remaining_amount: processedData.totalPlotAmount && processedData.bookingAmount ? 
                processedData.totalPlotAmount - processedData.bookingAmount : null,
            tenure_months: processedData.tenureMonths || null,
            paid_percentage: processedData.totalPlotAmount && processedData.bookingAmount ? 
                (processedData.bookingAmount / processedData.totalPlotAmount * 100) : 0,
            commission_status: 'pending',
            created_by: user.id,
            updated_by: processedData.brokerId || user.id
        };

        logger.dev('🟡 plotData to be inserted:', {
            total_plot_amount: plotData.total_plot_amount,
            booking_amount: plotData.booking_amount,
            remaining_amount: plotData.remaining_amount,
            tenure_months: plotData.tenure_months,
            paid_percentage: plotData.paid_percentage,
            commission_status: plotData.commission_status,
            status: plotData.status,
        });

        const { data: newPlot, error } = await supabaseAdmin
            .from('plots')
            .insert(plotData)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error(`Plot #${data.plotNumber} already exists in project ${data.projectName}.`);
            }
            throw new Error(`Failed to add plot: ${error.message}`);
        }

        // Commission will be calculated separately when needed
        // This is handled by the commission-actions module

        logger.dev('💰 Checking if initial payment should be created:', {
            status: processedData.status,
            statusLower: processedData.status?.toLowerCase(),
            bookingAmount: processedData.bookingAmount,
            shouldCreate: processedData.status?.toLowerCase() === 'booked' && processedData.bookingAmount && processedData.bookingAmount > 0,
        });
        
        if (processedData.status?.toLowerCase() === 'booked' && processedData.bookingAmount && processedData.bookingAmount > 0) {
            logger.dev('💰 Creating initial payment_history entry:', {
                plot_id: newPlot.id,
                buyer_name: processedData.buyerName || 'N/A',
                broker_id: processedData.brokerId || null,
                amount_received: processedData.bookingAmount,
            });
            
            const { data: paymentEntry, error: paymentError } = await supabaseAdmin
                .from('payment_history')
                .insert({
                    plot_id: newPlot.id,
                    buyer_name: processedData.buyerName || 'N/A',
                    broker_id: processedData.brokerId || null,
                    amount_received: processedData.bookingAmount,
                    payment_date: new Date().toISOString().split('T')[0],
                    notes: 'Initial booking amount',
                    updated_by: user.id,
                })
                .select()
                .single();
            
            if (paymentError) {
                logger.error('❌ Error creating initial payment:', paymentError);
                throw new Error(`Failed to create initial payment: ${paymentError.message}`);
            }
            
            logger.dev('✅ Initial payment created:', paymentEntry);
        }
        
        revalidatePath('/admin/inventory');
        revalidatePath('/broker/inventory');
        revalidatePath('/investor/dashboard');
        revalidatePath('/admin/commissions');
        revalidatePath('/admin/booked-plots');
    } catch (error) {
        logger.error("Error adding plot:", error);
        throw error instanceof Error ? error : new Error("Failed to add plot due to a server error.");
    }
}

export async function updatePlot(id: string, data: Partial<PlotFormValues>) {
    logger.dev('🚀 updatePlot called with:', { id, data });
    
    await authorizeAdmin();
    const { user } = await getAuthenticatedUser();
    const supabaseAdmin = getSupabaseAdminClient();

    try {
        const { data: originalPlot, error: fetchError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !originalPlot) {
            throw new Error("Plot not found.");
        }
        
        logger.dev('📦 Original plot data:', originalPlot);

        if (data.plotNumber || data.projectName) {
            const plotNumber = data.plotNumber ? data.plotNumber.toString() : originalPlot.plot_number;
            const projectName = data.projectName || originalPlot.project_name;

            if (data.plotNumber && isNaN(Number(data.plotNumber))) {
                throw new Error('Invalid plot number provided.');
            }

            const { data: duplicatePlots, error: duplicateError } = await supabaseAdmin
                .from('plots')
                .select('id')
                .eq('project_name', projectName)
                .eq('plot_number', plotNumber)
                .neq('id', id);

            if (duplicateError) {
                throw new Error(`Error checking for duplicates: ${duplicateError.message}`);
            }

            if (duplicatePlots && duplicatePlots.length > 0) {
                throw new Error(`Plot #${plotNumber} already exists in project ${projectName}.`);
            }
        }

        const isNowSold = data.status === 'sold' && originalPlot.status !== 'sold';
        
        const processedData: any = { ...data };
        
        if (processedData.salePrice !== undefined) {
            processedData.salePrice = typeof processedData.salePrice === 'string' ? 
                parseFloat(processedData.salePrice) : processedData.salePrice;
        }
        if (processedData.commissionRate !== undefined) {
            processedData.commissionRate = typeof processedData.commissionRate === 'string' ? 
                parseFloat(processedData.commissionRate) : processedData.commissionRate;
        }
        if (processedData.soldAmount !== undefined) {
            processedData.soldAmount = typeof processedData.soldAmount === 'string' ? 
                parseFloat(processedData.soldAmount) : processedData.soldAmount;
        }
        if (processedData.plotNumber !== undefined) {
            processedData.plotNumber = typeof processedData.plotNumber === 'string' ? 
                parseInt(processedData.plotNumber) : processedData.plotNumber;
        }
        if (processedData.area !== undefined) {
            processedData.area = typeof processedData.area === 'string' ? 
                parseFloat(processedData.area) : processedData.area;
        }
        if (processedData.totalPlotAmount !== undefined) {
            processedData.totalPlotAmount = typeof processedData.totalPlotAmount === 'string' ? 
                parseFloat(processedData.totalPlotAmount) : processedData.totalPlotAmount;
        }
        if (processedData.bookingAmount !== undefined) {
            processedData.bookingAmount = typeof processedData.bookingAmount === 'string' ? 
                parseFloat(processedData.bookingAmount) : processedData.bookingAmount;
        }
        if (processedData.tenureMonths !== undefined) {
            processedData.tenureMonths = typeof processedData.tenureMonths === 'string' ? 
                parseInt(processedData.tenureMonths) : processedData.tenureMonths;
        }

        const updateData: any = {
            updated_by: user.id,
        };

        if (processedData.projectName !== undefined) updateData.project_name = processedData.projectName;
        if (processedData.type !== undefined) updateData.type = processedData.type;
        if (processedData.block !== undefined) updateData.block = processedData.block;
        if (processedData.plotNumber !== undefined) updateData.plot_number = processedData.plotNumber.toString();
        if (processedData.dimension !== undefined) updateData.dimension = processedData.dimension;
        if (processedData.area !== undefined) updateData.area = processedData.area;
        if (processedData.facing !== undefined) updateData.facing = processedData.facing;
        if (processedData.status !== undefined) updateData.status = processedData.status;
        if (processedData.price !== undefined) updateData.price = processedData.price;
        if (processedData.salePrice !== undefined) updateData.sale_price = processedData.salePrice;
        if (processedData.buyerName !== undefined) updateData.buyer_name = processedData.buyerName || null;
        if (processedData.buyerPhone !== undefined) updateData.buyer_phone = processedData.buyerPhone || null;
        if (processedData.buyerEmail !== undefined) updateData.buyer_email = processedData.buyerEmail || null;
        if (processedData.saleDate !== undefined) updateData.sale_date = processedData.saleDate || null;
        if (processedData.soldAmount !== undefined) updateData.sold_amount = processedData.soldAmount;
        if (processedData.commissionRate !== undefined) updateData.commission_rate = processedData.commissionRate;
        if (processedData.sellerName !== undefined) updateData.seller_name = processedData.sellerName || null;
        if (processedData.totalPlotAmount !== undefined) updateData.total_plot_amount = processedData.totalPlotAmount;
        if (processedData.bookingAmount !== undefined) updateData.booking_amount = processedData.bookingAmount;
        if (processedData.tenureMonths !== undefined) updateData.tenure_months = processedData.tenureMonths;
        if (processedData.brokerId !== undefined) updateData.broker_id = processedData.brokerId || null;
        if (processedData.brokerName !== undefined) updateData.broker_name = processedData.brokerName || null;
        if (processedData.totalPlotAmount !== undefined && processedData.bookingAmount !== undefined) {
            updateData.remaining_amount = processedData.totalPlotAmount - processedData.bookingAmount;
            updateData.paid_percentage = (processedData.bookingAmount / processedData.totalPlotAmount * 100);
        }

        if (processedData.status === 'sold' && (!processedData.salePrice || processedData.salePrice === 0 || !processedData.saleDate)) {
            const { data: payments } = await supabaseAdmin
                .from('payment_history')
                .select('amount_received, buyer_name, payment_date, created_at')
                .eq('plot_id', id)
                .order('created_at', { ascending: false })
                .limit(1);
            
            const totalPaid = (payments || []).reduce((sum: number, p: any) => sum + (p.amount_received || 0), 0);
            
            if (totalPaid > 0 && (!processedData.salePrice || processedData.salePrice === 0)) {
                updateData.sale_price = totalPaid;
                logger.dev(`🔄 Auto-setting sale_price to ₹${totalPaid} (from payment_history) for plot ${id}`);
            }
            
            if (!processedData.saleDate && payments && payments.length > 0) {
                const payment = payments[0];
                const dateToUse = payment.payment_date || payment.created_at || new Date().toISOString();
                updateData.sale_date = dateToUse;
                logger.dev(`🔄 Auto-setting sale_date to ${dateToUse} (from payment_history) for plot ${id}`);
            }
            
            if (!processedData.buyerName && payments && payments.length > 0 && payments[0].buyer_name) {
                updateData.buyer_name = payments[0].buyer_name;
                logger.dev(`🔄 Auto-setting buyer_name to ${payments[0].buyer_name} (from payment_history) for plot ${id}`);
            }
        }

        if (processedData.status === 'sold' && processedData.brokerId && processedData.brokerId.trim()) {
            updateData.updated_by = processedData.brokerId;
            logger.dev(`🔄 Setting updated_by to broker: ${processedData.brokerId} (not admin: ${user.id})`);
        }

        const { error: updateError } = await supabaseAdmin
            .from('plots')
            .update(updateData)
            .eq('id', id);

        if (updateError) {
            throw new Error(`Failed to update plot: ${updateError.message}`);
        }

        revalidatePath('/admin/inventory');
        revalidatePath('/broker/inventory');
        revalidatePath('/investor/dashboard');
        revalidatePath('/admin/commissions');
        revalidatePath('/admin/brokers');
        revalidatePath('/admin/associates');

        const isSoldToNonSold = originalPlot.status === 'sold' && processedData.status && processedData.status !== 'sold';
        if (isSoldToNonSold) {
            logger.dev('🔄 Plot status reverting from SOLD to non-sold state. Commission reversal handled separately.');
            // Commission reversal is handled by wallet-actions module
        }

        const isFirstSoldTransition = originalPlot.status !== 'sold' && processedData.status === 'sold';
        const shouldCalculateCommission = (
            isFirstSoldTransition &&
            processedData.brokerId &&
            (processedData.area || originalPlot.area) &&
            (processedData.area || originalPlot.area) > 0
        );

        logger.dev('Should calculate commission?', shouldCalculateCommission, { isFirstSoldTransition });
        
        if (shouldCalculateCommission) {
            logger.dev('Processing commission calculation (GAJ-BASED)...');
            
            const plotArea = processedData.area || originalPlot.area;
            
            if (isNaN(plotArea) || plotArea <= 0) {
                throw new Error("Plot area must be a valid positive number (in gaj)");
            }
            
            // Commission calculation is now handled separately by commission-actions module
            logger.dev('Commission calculation will be processed by commission module');
        } else {
            logger.dev('⏭️ Commission calculation skipped.', {
                reason: !isFirstSoldTransition ? 'Not first sold transition (either already sold or not sold status)' : 'Missing data',
                brokerId: processedData.brokerId,
                originalStatus: originalPlot.status,
                newStatus: processedData.status
            });
        }
    } catch (error) {
        logger.error("❌ Error updating plot:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to update plot due to a server error.");
    }
}

export async function removeDuplicatePlots() {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    
    try {
        const { data: allPlots, error: fetchError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .order('created_at', { ascending: true });

        if (fetchError) {
            throw new Error(`Failed to fetch plots: ${fetchError.message}`);
        }

        if (!allPlots) {
            return {
                success: true,
                duplicatesRemoved: 0,
                uniquePlotsRemaining: 0,
                message: "No plots found."
            };
        }
        
        logger.dev(`\n=== DUPLICATE REMOVAL STARTED ===`);
        logger.dev(`Total plots found: ${allPlots.length}`);
        
        const uniquePlots = new Map<string, string>();
        const duplicatesToDelete: string[] = [];
        
        allPlots.forEach(plot => {
            if (!plot.project_name || !plot.plot_number) {
                duplicatesToDelete.push(plot.id);
                logger.dev(`❌ Removing corrupt plot: ${plot.id} (missing project/plotNumber)`);
                return;
            }
            
            const uniqueKey = `${plot.project_name}-${plot.plot_number}`;
            
            if (uniquePlots.has(uniqueKey)) {
                duplicatesToDelete.push(plot.id);
                logger.dev(`🔄 Removing duplicate: Plot ${plot.plot_number} in ${plot.project_name} (ID: ${plot.id})`);
            } else {
                uniquePlots.set(uniqueKey, plot.id);
                logger.dev(`✅ Keeping: Plot ${plot.plot_number} in ${plot.project_name} (ID: ${plot.id})`);
            }
        });
        
        logger.dev(`\n📊 SUMMARY:`);
        logger.dev(`- Unique plots to keep: ${uniquePlots.size}`);
        logger.dev(`- Duplicates to remove: ${duplicatesToDelete.length}`);
        
        if (duplicatesToDelete.length > 0) {
            const { error: deleteError } = await supabaseAdmin
                .from('plots')
                .delete()
                .in('id', duplicatesToDelete);

            if (deleteError) {
                throw new Error(`Failed to delete duplicates: ${deleteError.message}`);
            }
            
            logger.dev(`✨ Successfully deleted ${duplicatesToDelete.length} duplicate plots`);
        }
        
        revalidatePath('/admin/inventory');
        revalidatePath('/broker/inventory');
        revalidatePath('/investor/dashboard');
        
        return {
            success: true,
            duplicatesRemoved: duplicatesToDelete.length,
            uniquePlotsRemaining: uniquePlots.size,
            message: `Removed ${duplicatesToDelete.length} duplicates. ${uniquePlots.size} unique plots remain.`
        };
    } catch (error) {
        logger.error("❌ Error removing duplicates:", error);
        throw new Error("Failed to remove duplicate plots.");
    }
}

export async function cleanupCorruptPlots() {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    
    try {
        const { data: allPlots, error: fetchError } = await supabaseAdmin
            .from('plots')
            .select('*');

        if (fetchError) {
            throw new Error(`Failed to fetch plots: ${fetchError.message}`);
        }

        if (!allPlots) {
            return {
                success: true,
                corruptPlotsRemoved: 0,
                message: "No plots found"
            };
        }
        
        const corruptPlots: string[] = [];
        
        allPlots.forEach(plot => {
            if (!plot.project_name || plot.plot_number === undefined || plot.plot_number === null) {
                corruptPlots.push(plot.id);
                logger.dev(`Found corrupt plot: ${plot.id}`, {
                    projectName: plot.project_name,
                    plotNumber: plot.plot_number
                });
            }
        });
        
        if (corruptPlots.length > 0) {
            const { error: deleteError } = await supabaseAdmin
                .from('plots')
                .delete()
                .in('id', corruptPlots);

            if (deleteError) {
                throw new Error(`Failed to delete corrupt plots: ${deleteError.message}`);
            }
            
            logger.dev(`Successfully deleted ${corruptPlots.length} corrupt plots`);
        }
        
        revalidatePath('/admin/inventory');
        revalidatePath('/broker/inventory');
        revalidatePath('/investor/dashboard');
        
        return {
            success: true,
            corruptPlotsRemoved: corruptPlots.length,
            message: corruptPlots.length > 0 
                ? `Successfully removed ${corruptPlots.length} corrupt plots`
                : `No corrupt plots found`
        };
    } catch (error) {
        logger.error("Error cleaning up corrupt plots:", error);
        throw new Error("Failed to cleanup corrupt plots.");
    }
}

export async function analyzeDuplicatePlots() {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    
    try {
        const { data: allPlots, error: fetchError } = await supabaseAdmin
            .from('plots')
            .select('*');

        if (fetchError) {
            throw new Error(`Failed to fetch plots: ${fetchError.message}`);
        }

        if (!allPlots) {
            return {
                totalPlots: 0,
                corruptPlots: [],
                duplicateGroups: [],
                projectDuplicates: [],
                totalExactDuplicates: 0,
                totalProjectDuplicates: 0
            };
        }
        
        const plotMap = new Map<string, any[]>();
        const duplicateGroups: any[] = [];
        const corruptPlots: any[] = [];
        
        allPlots.forEach(plot => {
            if (!plot.project_name || plot.plot_number === undefined) {
                corruptPlots.push({
                    id: plot.id,
                    data: plot
                });
                return;
            }
            
            const projectName = plot.project_name;
            const plotNumber = plot.plot_number;
            const globalKey = `${projectName}_${plotNumber}`;
            
            if (!plotMap.has(globalKey)) {
                plotMap.set(globalKey, []);
            }
            plotMap.get(globalKey)!.push({ 
                id: plot.id, 
                projectName: plot.project_name,
                plotNumber: plot.plot_number,
                createdAt: plot.created_at ? new Date(plot.created_at) : null,
                status: plot.status,
                globalKey,
            });
        });
        
        plotMap.forEach((plots, key) => {
            if (plots.length > 1) {
                duplicateGroups.push({
                    type: 'exact',
                    key,
                    count: plots.length,
                    plots: plots.sort((a, b) => {
                        const aTime = a.createdAt || new Date(0);
                        const bTime = b.createdAt || new Date(0);
                        return aTime.getTime() - bTime.getTime();
                    })
                });
            }
        });
        
        return {
            totalPlots: allPlots.length,
            corruptPlots: corruptPlots,
            duplicateGroups: duplicateGroups,
            projectDuplicates: [],
            totalExactDuplicates: duplicateGroups.reduce((sum, group) => sum + (group.count - 1), 0),
            totalProjectDuplicates: 0
        };
    } catch (error) {
        logger.error("Error analyzing duplicate plots:", error);
        throw new Error("Failed to analyze duplicate plots.");
    }
}

export async function canDeletePlot(plotId: string): Promise<{ canDelete: boolean; reason?: string }> {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();

    try {
        const { data: plot, error: plotError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .eq('id', plotId)
            .single();

        if (plotError || !plot) {
            return { canDelete: false, reason: 'Plot not found' };
        }

        if (plot.status === 'booked' || plot.status === 'sold') {
            return { canDelete: false, reason: `Cannot delete ${plot.status} plots. Only available plots can be deleted.` };
        }

        const { data: payments, error: paymentError } = await supabaseAdmin
            .from('payment_history')
            .select('id', { count: 'exact', head: true })
            .eq('plot_id', plotId);

        if (!paymentError && payments && payments.length > 0) {
            return { canDelete: false, reason: 'Cannot delete plots with payment history.' };
        }

        const { data: plotHistory, error: historyError } = await supabaseAdmin
            .from('plot_history')
            .select('id', { count: 'exact', head: true })
            .eq('plot_id', plotId);

        if (!historyError && plotHistory && plotHistory.length > 0) {
            return { canDelete: false, reason: 'Cannot delete plots with history records.' };
        }

        const { data: transactions, error: txError } = await supabaseAdmin
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('plot_id', plotId);

        if (!txError && transactions && transactions.length > 0) {
            return { canDelete: false, reason: 'Cannot delete plots with transaction history.' };
        }

        const { data: commissions, error: commError } = await supabaseAdmin
            .from('commissions')
            .select('id', { count: 'exact', head: true })
            .eq('plot_id', plotId);

        if (!commError && commissions && commissions.length > 0) {
            return { canDelete: false, reason: 'Cannot delete plots with commission records.' };
        }

        return { canDelete: true };
    } catch (error) {
        logger.error('Error checking if plot can be deleted:', error);
        return { canDelete: false, reason: 'Error checking plot eligibility for deletion' };
    }
}

export async function deletePlot(id: string) {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    
    try {
        const { canDelete, reason } = await canDeletePlot(id);
        
        if (!canDelete) {
            throw new Error(reason || 'This plot cannot be deleted.');
        }

        await supabaseAdmin
            .from('plot_history')
            .delete()
            .eq('plot_id', id);

        await supabaseAdmin
            .from('payment_history')
            .delete()
            .eq('plot_id', id);

        await supabaseAdmin
            .from('transactions')
            .delete()
            .eq('plot_id', id);

        await supabaseAdmin
            .from('commissions')
            .delete()
            .eq('plot_id', id);

        const { error: plotError } = await supabaseAdmin
            .from('plots')
            .delete()
            .eq('id', id);

        if (plotError) {
            const { data: stillExists } = await supabaseAdmin
                .from('plots')
                .select('id')
                .eq('id', id)
                .single();
            
            if (stillExists) {
                throw new Error(`Failed to delete plot: ${plotError.message}`);
            }
            logger.dev('⚠️ Plot deleted despite trigger conflict (expected behavior)');
        }

        logger.dev('✅ Plot deleted successfully');

        revalidatePath('/admin/inventory');
        revalidatePath('/broker/inventory');
        revalidatePath('/investor/dashboard');
        revalidatePath('/admin/associates');
    } catch (error) {
        logger.error("Error deleting plot: ", error);
        throw error;
    }
}

export async function bulkAddPlots(data: BulkAddPlotsData) {
    await authorizeAdmin();
    const { user } = await getAuthenticatedUser();
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: existingPlots, error: checkError } = await supabaseAdmin
        .from('plots')
        .select('plot_number')
        .eq('project_name', data.projectName);

    if (checkError) {
        throw new Error(`Error checking existing plots: ${checkError.message}`);
    }

    const existingPlotNumbers = new Set(existingPlots?.map(p => parseInt(p.plot_number)) || []);
    
    const plotsToInsert = [];
    let plotNumber = data.startingPlotNumber || 1;
    let addedCount = 0;

    while (addedCount < data.totalPlots) {
        if (!existingPlotNumbers.has(plotNumber)) {
            const plotData = {
                project_name: data.projectName,
                type: data.type || 'Residential',
                block: data.block || 'A',
                plot_number: plotNumber.toString(),
                dimension: data.dimension || `${Math.sqrt(data.area || 1000).toFixed(0)}x${Math.sqrt(data.area || 1000).toFixed(0)} ft`,
                area: data.area,
                facing: data.facing || 'North',
                status: 'available',
                price: null,
                sale_price: null,
                buyer_name: null,
                buyer_phone: null,
                buyer_email: null,
                sale_date: null,
                broker_name: null,
                broker_id: null,
                seller_name: null,
                sold_amount: null,
                commission_rate: null,
                created_by: user.id,
                updated_by: null,
            };

            plotsToInsert.push(plotData);
            addedCount++;
        }
        plotNumber++;
    }

    try {
        const { error: insertError } = await supabaseAdmin
            .from('plots')
            .insert(plotsToInsert);

        if (insertError) {
            throw new Error(`Failed to insert plots: ${insertError.message}`);
        }

        revalidatePath('/admin/inventory');
        revalidatePath('/broker/inventory');
        revalidatePath('/investor/dashboard');
        return { success: true, count: data.totalPlots };
    } catch (error) {
        logger.error("Error during bulk add:", error);
        throw new Error("Failed to generate plots due to a database error.");
    }
}

export async function getPlotHistory(options: { plotId?: string; action?: string; limit?: number } = {}): Promise<PlotHistoryRecord[]> {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    let query = supabaseAdmin.from('plot_history').select('*').order('created_at', { ascending: false });
    if (options.plotId) query = query.eq('plot_id', options.plotId);
    if (options.action) query = query.eq('action', options.action);
    if (options.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch plot history: ${error.message}`);
    return (data || []) as PlotHistoryRecord[];
}

export async function getPublicPlots(): Promise<Plot[]> {
    try {
        const supabaseAdmin = getSupabaseAdminClient();

        const { data: plots, error } = await supabaseAdmin
            .from('plots')
            .select(`
                id,
                project_name,
                type,
                block,
                plot_number,
                status,
                dimension,
                area,
                buyer_name,
                total_plot_amount,
                buyer_phone,
                buyer_email,
                sale_date
            `)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch plots: ${error.message}`);
        }

        if (!plots) return [];

        const plotIds = plots.map(p => p.id);
        let bookingDates: Record<string, string | null> = {};
        if (plotIds.length > 0) {
            const { data: payments, error: payErr } = await supabaseAdmin
                .from('payment_history')
                .select('plot_id, payment_date')
                .in('plot_id', plotIds);
            if (!payErr && payments) {
                for (const p of payments) {
                    if (!bookingDates[p.plot_id] || new Date(p.payment_date) < new Date(bookingDates[p.plot_id]!)) {
                        bookingDates[p.plot_id] = p.payment_date;
                    }
                }
            }
        }

        return plots.map(plot => ({
            id: plot.id,
            projectName: plot.project_name,
            type: plot.type || 'Residential',
            block: plot.block || 'A',
            plotNumber: plot.plot_number,
            status: plot.status,
            dimension: plot.dimension || `${Math.sqrt(plot.area || 1000).toFixed(0)}x${Math.sqrt(plot.area || 1000).toFixed(0)} ft`,
            area: plot.area,
            buyerName: plot.buyer_name,
            buyerPhone: plot.buyer_phone,
            buyerEmail: plot.buyer_email,
            totalAmount: plot.total_plot_amount,
            saleDate: plot.sale_date || null,
            bookingDate: bookingDates[plot.id] || null
        }));
    } catch (error) {
        logger.error('Error in getPublicPlots:', error);
        throw new Error(`Failed to get plots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function getPlots() {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: plots, error } = await supabaseAdmin
            .from('plots')
            .select(`
                *,
                profiles:broker_id(full_name)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch plots: ${error.message}`);
        }

        if (!plots) return [];

        const enrichedPlots = await Promise.all(plots.map(async (plot) => {
            let buyerName = plot.buyer_name;
            let saleDate = plot.sale_date;
            
            if (plot.status === 'sold' && (!buyerName || !saleDate)) {
                const { data: payments } = await supabaseAdmin
                    .from('payment_history')
                    .select('buyer_name, payment_date, created_at')
                    .eq('plot_id', plot.id)
                    .order('payment_date', { ascending: false, nullsFirst: false })
                    .limit(1);
                
                if (payments && payments.length > 0) {
                    const payment = payments[0];
                    buyerName = buyerName || payment.buyer_name;
                    saleDate = saleDate || payment.payment_date || payment.created_at;
                    
                    logger.dev(`📅 Enriched plot ${plot.id}: buyer=${buyerName}, saleDate=${saleDate}`);
                }
            }
            
            return {
                ...plot,
                buyer_name: buyerName,
                sale_date: saleDate
            };
        }));

        return enrichedPlots.map(plot => ({
            id: plot.id,
            projectName: plot.project_name,
            type: plot.type || 'Residential',
            block: plot.block || 'A',
            plotNumber: plot.plot_number,
            status: plot.status,
            dimension: plot.dimension || `${Math.sqrt(plot.area || 1000).toFixed(0)}x${Math.sqrt(plot.area || 1000).toFixed(0)} ft`,
            area: plot.area,
            buyerName: plot.buyer_name,
            buyerPhone: plot.buyer_phone,
            buyerEmail: plot.buyer_email,
            price: plot.price,
            salePrice: plot.sale_price,
            saleDate: plot.sale_date,
            commissionRate: plot.commission_rate,
            brokerName: plot.broker_name || (plot.profiles ? plot.profiles.full_name : null),
            brokerId: plot.broker_id,
            sellerName: plot.seller_name,
            soldAmount: plot.sold_amount,
            totalPlotAmount: plot.total_plot_amount,
            bookingAmount: plot.booking_amount,
            remainingAmount: plot.remaining_amount,
            tenureMonths: plot.tenure_months,
            paidPercentage: plot.paid_percentage,
            createdAt: plot.created_at,
            updatedAt: plot.updated_at,
            updatedBy: plot.updated_by,
        }));
    } catch (error) {
        logger.error('Error in getPlots:', error);
        throw new Error(`Failed to get plots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
