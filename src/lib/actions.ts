

'use server'

// Firebase imports removed - now using Supabase only
import type { PlotFormValues } from '@/components/inventory/PlotForm';
import { Plot, PlotSchema, Wallet, Transaction, WithdrawalRequest } from './schema';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { logger } from './utils/logger';
import { GAJ_COMMISSION_RATES, calculateCommission } from './commissionConfig';
import { 
    getSupabaseAdminClient, 
    getAuthenticatedUser, 
    authorizeAdmin,
    buildDownlineTree,
    BrokerFormSchema,
    manageWalletSchema,
    BulkAddPlotsData
} from './serverUtils';
import { Broker, DownlineTreeData, TransactionRecord, WithdrawalRequestRecord, BrokerVerificationRecord, PlotHistoryRecord, BrokerHistoryRecord } from './types';
import { withdrawalRequestSchema, processWithdrawalSchema, brokerVerificationSubmissionSchema, processVerificationSchema, brokerReferralSubmissionSchema, processReferralSchema } from './schema';

export async function ensureUserProfile(userId: string, userMetadata?: any) {
    const supabaseAdmin = getSupabaseAdminClient();
    
    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
    
    // If profile exists, return it
    if (existingProfile && !checkError) {
        return existingProfile;
    }
    
    // If profile doesn't exist, create it
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

    // Supabase will handle unique constraint with database-level constraint

    try {
        // Convert string numbers to actual numbers for numeric fields
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
        // Process booked plot fields
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

        // Get user for audit fields
        const { user } = await getAuthenticatedUser();
        const supabaseAdmin = getSupabaseAdminClient();

        logger.dev('🟢 processedData after conversion:', {
            totalPlotAmount: processedData.totalPlotAmount,
            bookingAmount: processedData.bookingAmount,
            tenureMonths: processedData.tenureMonths,
            status: processedData.status,
        });

        // Prepare data for Supabase - map application fields to database fields
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
            // Booked plot fields
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

        // Insert plot to Supabase
        const { data: newPlot, error } = await supabaseAdmin
            .from('plots')
            .insert(plotData)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new Error(`Plot #${data.plotNumber} already exists in project ${data.projectName}.`);
            }
            throw new Error(`Failed to add plot: ${error.message}`);
        }

        // If plot is being created as sold, process commission immediately
        if (processedData.status === 'sold' && processedData.brokerId && processedData.area) {
            // Validate that we have a valid plot area (in gaj)
            if (isNaN(processedData.area) || processedData.area <= 0) {
                throw new Error("Plot area must be a valid positive number (in gaj)");
            }
            
            // Calculate and distribute commission using GAJ-BASED system
            // Pass area (gaj) as the second parameter instead of sale price
            await processCommissionCalculation(processedData.brokerId, processedData.area, {
                ...processedData,
                id: newPlot.id
            });
        }

        // If plot is being created as booked, add initial booking payment to payment_history
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
        // Get the original plot
        const { data: originalPlot, error: fetchError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !originalPlot) {
            throw new Error("Plot not found.");
        }
        
        logger.dev('📦 Original plot data:', originalPlot);

        // Check for duplicates if plot number or project is being changed
        if (data.plotNumber || data.projectName) {
            const plotNumber = data.plotNumber ? data.plotNumber.toString() : originalPlot.plot_number;
            const projectName = data.projectName || originalPlot.project_name;

            if (data.plotNumber && isNaN(Number(data.plotNumber))) {
                throw new Error('Invalid plot number provided.');
            }

            // Check for duplicates in Supabase
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
        const isSoldStatusUpdate = data.status === 'sold' && (
            // Plot is being marked as sold for the first time
            originalPlot.status !== 'sold' ||
            // Plot is already sold but broker/commission info is being updated
            (originalPlot.status === 'sold' && (
                data.brokerId !== originalPlot.updated_by ||
                data.commissionRate !== originalPlot.commission_rate ||
                data.soldAmount !== originalPlot.sale_price
            ))
        );
        
        // Convert string numbers to actual numbers for numeric fields
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
        // Process booked plot fields
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

        // Prepare update data for Supabase
        const updateData: any = {
            updated_by: user.id,  // Default to current user (admin)
        };

        // Map form fields to Supabase columns
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
        // Booked plot fields
        if (processedData.totalPlotAmount !== undefined) updateData.total_plot_amount = processedData.totalPlotAmount;
        if (processedData.bookingAmount !== undefined) updateData.booking_amount = processedData.bookingAmount;
        if (processedData.tenureMonths !== undefined) updateData.tenure_months = processedData.tenureMonths;
        // Convert empty string to null for UUID fields (Supabase requirement)
        if (processedData.brokerId !== undefined) updateData.broker_id = processedData.brokerId || null;
        if (processedData.brokerName !== undefined) updateData.broker_name = processedData.brokerName || null;
        // Calculate remaining amount and paid percentage for booked plots
        if (processedData.totalPlotAmount !== undefined && processedData.bookingAmount !== undefined) {
            updateData.remaining_amount = processedData.totalPlotAmount - processedData.bookingAmount;
            updateData.paid_percentage = (processedData.bookingAmount / processedData.totalPlotAmount * 100);
        }

        // IMPORTANT: If plot is sold and brokerId is provided, use broker's ID as updated_by
        // This ensures the broker gets credit for the sale, not the admin who saved the form
        if (processedData.status === 'sold' && processedData.brokerId && processedData.brokerId.trim()) {
            updateData.updated_by = processedData.brokerId;
            logger.dev(`🔄 Setting updated_by to broker: ${processedData.brokerId} (not admin: ${user.id})`);
        }

        // Update the plot in Supabase
        const { error: updateError } = await supabaseAdmin
            .from('plots')
            .update(updateData)
            .eq('id', id);

        if (updateError) {
            throw new Error(`Failed to update plot: ${updateError.message}`);
        }

        // Revalidate paths first
        revalidatePath('/admin/inventory');
        revalidatePath('/broker/inventory');
        revalidatePath('/investor/dashboard');
        revalidatePath('/admin/commissions');
        revalidatePath('/admin/brokers');
        revalidatePath('/admin/associates');

        // Process commission calculation in the background (non-blocking)
        const actualSaleAmount = processedData.soldAmount || processedData.salePrice;
        
        logger.dev('� PLOT UPDATE - Checking if commission calculation needed...');
        logger.dev('�🔍 Commission Check:', {
            isNowSold,
            isSoldStatusUpdate,
            brokerId: processedData.brokerId,
            salePrice: processedData.salePrice,
            soldAmount: processedData.soldAmount,
            actualSaleAmount,
            commissionRate: processedData.commissionRate,
            status: processedData.status,
            originalStatus: originalPlot.status,
            originalBrokerId: originalPlot.brokerId,
            originalUpdatedBy: originalPlot.updated_by,
            brokerChanged: data.brokerId !== originalPlot.updated_by
        });
        
        // Detect transition away from sold (reversion) BEFORE any new commission logic
        const isSoldToNonSold = originalPlot.status === 'sold' && processedData.status && processedData.status !== 'sold';
        if (isSoldToNonSold) {
            logger.dev('🔄 Plot status reverting from SOLD to non-sold state. Initiating commission reversal workflow...');
            try {
                await reversePlotFinancials(id, originalPlot);
                logger.dev('✅ Commission reversal completed for plot reversion.');
            } catch (revErr) {
                logger.error('❌ Commission reversal failed:', revErr);
            }
        }

        // Only calculate commissions on FIRST transition to sold (prevent duplicate or recalculation)
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
            
            // Get plot area (in gaj) for commission calculation
            const plotArea = processedData.area || originalPlot.area;
            
            // Validate that we have a valid plot area
            if (isNaN(plotArea) || plotArea <= 0) {
                throw new Error("Plot area must be a valid positive number (in gaj)");
            }
            
            // Process commission calculation asynchronously using GAJ-BASED system
            processCommissionCalculation(processedData.brokerId, plotArea, {
                ...originalPlot,
                ...processedData,
                id: id
            }).then(() => {
                logger.dev('Commission calculation completed successfully');
                // Revalidate again after commission processing
                revalidatePath('/admin/commissions');
                revalidatePath('/admin/brokers');
                revalidatePath('/admin/associates');
                revalidatePath('/broker/wallets');
            }).catch((error) => {
                logger.error('Error in commission calculation:', error);
                // Don't throw - just log the error
            });
        } else {
            logger.dev('⏭️ Commission calculation skipped.', {
                reason: !isFirstSoldTransition ? 'Not first sold transition (either already sold or not sold status)' : 'Missing data',
                brokerId: processedData.brokerId,
                actualSaleAmount,
                commissionRate: processedData.commissionRate,
                originalStatus: originalPlot.status,
                newStatus: processedData.status
            });
        }
    } catch (error) {
        logger.error("❌ Error updating plot:", error);
        // Preserve the original error message if it's an Error object
        if (error instanceof Error) {
            throw error; // Re-throw the original error with its message
        }
        throw new Error("Failed to update plot due to a server error.");
    }
}

// Simple function to remove ALL duplicate plots - keep only unique project+plotNumber combinations
export async function removeDuplicatePlots() {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    
    try {
        // Get all plots from Supabase
        const { data: allPlots, error: fetchError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .order('created_at', { ascending: true }); // Keep oldest plots

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
        
        const uniquePlots = new Map<string, string>(); // key -> plotId to keep
        const duplicatesToDelete: string[] = [];
        
        allPlots.forEach(plot => {
            // Skip plots with missing critical data
            if (!plot.project_name || !plot.plot_number) {
                duplicatesToDelete.push(plot.id);
                logger.dev(`❌ Removing corrupt plot: ${plot.id} (missing project/plotNumber)`);
                return;
            }
            
            // Create simple unique key: project + plotNumber  
            const uniqueKey = `${plot.project_name}-${plot.plot_number}`;
            
            if (uniquePlots.has(uniqueKey)) {
                // This is a duplicate - delete it
                duplicatesToDelete.push(plot.id);
                logger.dev(`🔄 Removing duplicate: Plot ${plot.plot_number} in ${plot.project_name} (ID: ${plot.id})`);
            } else {
                // First occurrence - keep it
                uniquePlots.set(uniqueKey, plot.id);
                logger.dev(`✅ Keeping: Plot ${plot.plot_number} in ${plot.project_name} (ID: ${plot.id})`);
            }
        });
        
        logger.dev(`\n📊 SUMMARY:`);
        logger.dev(`- Unique plots to keep: ${uniquePlots.size}`);
        logger.dev(`- Duplicates to remove: ${duplicatesToDelete.length}`);
        
        // Delete all duplicates
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

// Function to clean up corrupt/incomplete plot data
export async function cleanupCorruptPlots() {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    
    try {
        // Get all plots from Supabase
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
        
        // Find plots with missing required data
        allPlots.forEach(plot => {
            // Check if essential fields are missing or undefined
            if (!plot.project_name || plot.plot_number === undefined || plot.plot_number === null) {
                corruptPlots.push(plot.id);
                logger.dev(`Found corrupt plot: ${plot.id}`, {
                    projectName: plot.project_name,
                    plotNumber: plot.plot_number
                });
            }
        });
        
        // Delete corrupt plots
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

// Function to analyze duplicates without deleting them
export async function analyzeDuplicatePlots() {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    
    try {
        // Get all plots from Supabase
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
        
        // Group plots by unique identifier
        allPlots.forEach(plot => {
            // Check for corrupt/incomplete data
            if (!plot.project_name || plot.plot_number === undefined) {
                corruptPlots.push({
                    id: plot.id,
                    data: plot
                });
                return; // Skip corrupt plots
            }
            
            const projectName = plot.project_name;
            const plotNumber = plot.plot_number;
            
            // Create keys for different levels of duplicate detection
            const globalKey = `${projectName}_${plotNumber}`;
            const projectKey = `${projectName}_${plotNumber}`; // Same plot number in same project
            
            // Store in global map
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
                projectKey
            });
        });
        
        // Find exact duplicates (same project + plot number)
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
            projectDuplicates: [], // Simplified for Supabase structure
            totalExactDuplicates: duplicateGroups.reduce((sum, group) => sum + (group.count - 1), 0),
            totalProjectDuplicates: 0 // Simplified for Supabase structure
        };
    } catch (error) {
        logger.error("Error analyzing duplicate plots:", error);
        throw new Error("Failed to analyze duplicate plots.");
    }
}

export async function deletePlot(id: string) {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    
    try {
        // First, get the plot details to check if it was sold
        const { data: plot, error: plotError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .eq('id', id)
            .single();

        if (plotError) {
            throw new Error(`Failed to fetch plot: ${plotError.message}`);
        }

        // If plot was sold, we need to reverse commissions
        if (plot && plot.status === 'sold' && plot.broker_id) {
            logger.dev('🗑️ Deleting sold plot, reversing commissions...');
            
            // Get all transactions related to this plot
            const { data: plotTransactions, error: txError } = await supabaseAdmin
                .from('transactions')
                .select('*')
                .eq('plot_id', id);

            if (!txError && plotTransactions && plotTransactions.length > 0) {
                logger.dev(`Found ${plotTransactions.length} transactions to reverse`);
                
                // Reverse wallet balances for each transaction
                for (const tx of plotTransactions) {
                    if (tx.type === 'credit') {
                        // Deduct the commission amount from the wallet
                        const { data: wallet } = await supabaseAdmin
                            .from('wallets')
                            .select('*')
                            .eq('owner_id', tx.wallet_id)
                            .single();

                        if (wallet) {
                            const updates: any = {
                                updated_at: new Date().toISOString()
                            };

                            if (tx.wallet_type === 'direct') {
                                updates.direct_sale_balance = Math.max(0, (wallet.direct_sale_balance || 0) - tx.amount);
                                updates.total_balance = Math.max(0, (wallet.total_balance || 0) - tx.amount);
                            } else if (tx.wallet_type === 'downline') {
                                updates.downline_sale_balance = Math.max(0, (wallet.downline_sale_balance || 0) - tx.amount);
                                updates.total_balance = Math.max(0, (wallet.total_balance || 0) - tx.amount);
                            }

                            await supabaseAdmin
                                .from('wallets')
                                .update(updates)
                                .eq('owner_id', tx.wallet_id);

                            logger.dev(`✅ Reversed ₹${tx.amount} from wallet (${tx.wallet_type})`);
                        }
                    }
                }

                // Delete all transactions related to this plot
                const { error: deleteTxError } = await supabaseAdmin
                    .from('transactions')
                    .delete()
                    .eq('plot_id', id);

                if (deleteTxError) {
                    logger.error('Error deleting transactions:', deleteTxError);
                } else {
                    logger.dev('✅ Deleted all related transactions');
                }
            }

            // Delete commissions related to this plot
            const { error: deleteCommError } = await supabaseAdmin
                .from('commissions')
                .delete()
                .eq('plot_id', id);

            if (deleteCommError) {
                logger.error('Error deleting commissions:', deleteCommError);
            } else {
                logger.dev('✅ Deleted all related commissions');
            }
        }

        // Finally, delete the plot
        const { error } = await supabaseAdmin
            .from('plots')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete plot: ${error.message}`);
        }

        logger.dev('✅ Plot deleted successfully');

        revalidatePath('/admin/inventory');
        revalidatePath('/broker/inventory');
        revalidatePath('/investor/dashboard');
        revalidatePath('/admin/associates');
    } catch (error) {
        logger.error("Error deleting plot: ", error);
        throw new Error("Could not delete the plot.");
    }
}

export async function bulkAddPlots(data: BulkAddPlotsData) {
    await authorizeAdmin();
    const { user } = await getAuthenticatedUser();
    const supabaseAdmin = getSupabaseAdminClient();

    // Check existing plot numbers for this project to avoid conflicts
    const { data: existingPlots, error: checkError } = await supabaseAdmin
        .from('plots')
        .select('plot_number')
        .eq('project_name', data.projectName);

    if (checkError) {
        throw new Error(`Error checking existing plots: ${checkError.message}`);
    }

    const existingPlotNumbers = new Set(existingPlots?.map(p => parseInt(p.plot_number)) || []);
    
    // Find the next available plot numbers
    const plotsToInsert = [];
    let plotNumber = data.startingPlotNumber || 1;
    let addedCount = 0;

    // Generate plot data, skipping existing plot numbers
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
        // Insert all plots in a single batch
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

export async function createBroker(values: z.infer<typeof BrokerFormSchema> & Partial<import('./types').BrokerReferralRecord>) {
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

    // Create profile record for the new broker
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

    // Use upsert so this operation is idempotent: if the auth trigger already
    // created a profile (or the profile exists for any reason), we won't fail
    // here with a duplicate-key error.
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

    if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`User created but failed to create/ensure profile: ${profileError.message}. The operation has been rolled back.`);
    }
    
    // Create wallet in Supabase (wallet will be auto-created by our trigger or when first accessed)
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
        // Don't throw error here as wallet creation is not critical
    }

    revalidatePath('/admin/brokers');
    revalidatePath('/admin/associates');
    return { success: true };
}

export async function getBrokers(): Promise<Broker[]> {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();

    // Exclude soft-deleted profiles (deleted_at IS NULL)
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
    
    // Get wallets from Supabase
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

    // Get sold plots from Supabase
    const brokersWithPlots = await Promise.all(combinedData.map(async (broker) => {
        // Get plots where this broker is the seller (broker_id) OR old plots where they were updated_by
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
        
        return { ...broker, soldPlots: soldPlotsFormatted };
    }));

    return brokersWithPlots;
}

export async function deleteBroker(userId: string) {
    // Soft delete with business guard rules:
    // 1. Broker must have zero direct + downline balance (wallet totals)
    // 2. Broker must have no sold plots (direct sales) AND no downline members
    // 3. Broker must have no commission transactions (credit type) remaining (defensive)
    // Instead of hard-deleting, mark profile.deleted_at and nullify references using DB function safe_delete_profile.

    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();

    // Fetch profile basic info
    const { data: profile, error: profileFetchError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .eq('id', userId)
        .single();
    if (profileFetchError || !profile) {
        throw new Error('Profile not found or could not be loaded.');
    }

    // Wallet balances
    const { data: wallet, error: walletLoadError } = await supabaseAdmin
        .from('wallets')
        .select('direct_sale_balance, downline_sale_balance, total_balance')
        .eq('owner_id', userId)
        .single();
    if (walletLoadError && walletLoadError.code !== 'PGRST116') { // PGRST116 no rows
        throw new Error(`Could not load wallet: ${walletLoadError.message}`);
    }

    const directBalance = wallet?.direct_sale_balance ?? 0;
    const downlineBalance = wallet?.downline_sale_balance ?? 0;
    const totalBalance = wallet?.total_balance ?? (directBalance + downlineBalance);

    if (directBalance !== 0 || downlineBalance !== 0 || totalBalance !== 0) {
        throw new Error('Cannot delete: broker has non-zero wallet balances. Settle balances first.');
    }

    // Sold plots check
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

    // Downline members (sponsored brokers)
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

    // Commission transactions (credit type referencing this broker's wallet)
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

    // At this point safe to soft-delete. Call DB function to nullify refs & mark deleted_at
    const { error: softDeleteError } = await supabaseAdmin.rpc('safe_delete_profile', { p_profile_id: userId });
    if (softDeleteError) {
        throw new Error(`Soft delete failed: ${softDeleteError.message}`);
    }

    // Remove Auth user (optional; if you prefer keep for audit, skip)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError && !authError.message.includes('User not found')) {
        // Not fatal; log
        logger.dev('Auth delete warning:', authError.message);
    }

    // Delete wallet row (optional) or leave for historical referencing; choose to delete since balances zero
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

export async function getDownlineTreeForBroker(brokerId: string): Promise<DownlineTreeData | null> {
    await authorizeAdmin(); 
    return buildDownlineTree(brokerId);
}

// ==========================
// AUDIT / HISTORY FUNCTIONS
// ==========================
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

export async function getMyDownlineTree(): Promise<DownlineTreeData | null> {
    const { user } = await getAuthenticatedUser('broker');
    return buildDownlineTree(user.id);
}

export async function getBrokerWallets(): Promise<Wallet | null> {
    const { user } = await getAuthenticatedUser('broker');
    const supabaseAdmin = getSupabaseAdminClient();

    // Try to get existing wallet
    const { data: wallet, error } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('owner_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw new Error(`Failed to fetch wallet: ${error.message}`);
    }

    if (!wallet) {
        logger.dev(`No wallet found for broker ${user.id}, creating one.`);
        
        // Create new wallet
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

    // Get sponsor name if uplineId exists
    let sponsorName = null;
    if (profile.uplineId) {
        const { data: sponsorData } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', profile.uplineId)
            .single();
        sponsorName = sponsorData?.full_name || null;
    }

    // Get verification status with full details
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
        .eq('wallet_id', targetBrokerId) // Changed from user_id to wallet_id
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
            // Old format: "Direct commission from plot sale (6%) - Plot #6 - Green Valley"
            // Extract just the plot-related part
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

// Broker Verification Actions
export async function submitBrokerVerification(values: z.infer<typeof brokerVerificationSubmissionSchema>) {
    const { user } = await getAuthenticatedUser('broker');
    const supabaseAdmin = getSupabaseAdminClient();
    
    // Check if broker already has a pending or approved verification
    const { data: existingVerification, error: checkError } = await supabaseAdmin
        .from('broker_verifications')
        .select('id')
        .eq('broker_id', user.id)
        .in('status', ['pending', 'approved'])
        .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw new Error(`Error checking existing verification: ${checkError.message}`);
    }

    if (existingVerification) {
        throw new Error("You already have a pending or approved verification request.");
    }

    // Get broker profile info
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

    if (!profile) {
        throw new Error("Broker profile not found");
    }

    // Update broker profile with verification details
    const updateData = {
        full_name: values.fullName,
        email: values.email,
        mobile_number: values.mobileNumber,
        address: values.address,
        profile_completed: true,
    };
    
    logger.dev('Attempting to update profile with:', updateData);
    
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select();

    if (updateError) {
        logger.error('Error updating profile:', updateError);
        throw new Error(`Failed to update profile: ${updateError.message}`);
    }
    
    logger.dev('Profile updated successfully:', updatedProfile);
    
    const { error: insertError } = await supabaseAdmin
        .from('broker_verifications')
        .insert({
            broker_id: user.id,
            broker_name: values.fullName,
            broker_email: values.email,
            full_name: values.fullName,
            id_type: values.idType,
            id_number: values.idNumber,
            id_image_data: values.idImageData,
            id_image_type: values.idImageType,
            id_image_size: values.idImageSize,
            status: 'pending',
        });

    if (insertError) {
        throw new Error(`Failed to submit verification: ${insertError.message}`);
    }

    revalidatePath('/broker/verification');
    revalidatePath('/broker/dashboard');
    revalidatePath('/broker/account');
    revalidatePath('/admin/verifications');
}

export async function getBrokerVerificationStatus(brokerId?: string): Promise<BrokerVerificationRecord | null> {
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

    const { data: verifications, error } = await supabaseAdmin
        .from('broker_verifications')
        .select('*')
        .eq('broker_id', targetBrokerId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        throw new Error(`Failed to get verification status: ${error.message}`);
    }

    if (!verifications || verifications.length === 0) return null;
    
    const verification = verifications[0];
    
    return {
        id: verification.id,
        brokerId: verification.broker_id,
        brokerName: verification.broker_name,
        brokerEmail: verification.broker_email,
        fullName: verification.full_name,
        idType: verification.id_type,
        idNumber: verification.id_number,
        idImageData: verification.id_image_data || '', 
        idImageType: verification.id_image_type || 'image/jpeg',
        idImageSize: verification.id_image_size || 0,
        status: verification.status,
        rejectionReason: verification.rejection_reason || null,
        createdAt: verification.created_at,
        processedAt: verification.processed_at,
        processedBy: verification.processed_by || null,
    };
}

export async function getAllBrokerVerifications(): Promise<BrokerVerificationRecord[]> {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    
    const { data: verifications, error } = await supabaseAdmin
        .from('broker_verifications')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to get verifications: ${error.message}`);
    }

    return verifications.map(verification => ({
        id: verification.id,
        brokerId: verification.broker_id,
        brokerName: verification.broker_name,
        brokerEmail: verification.broker_email,
        fullName: verification.full_name,
        idType: verification.id_type,
        idNumber: verification.id_number,
        idImageData: verification.id_image_data || '', 
        idImageType: verification.id_image_type || 'image/jpeg',
        idImageSize: verification.id_image_size || 0,
        status: verification.status,
        rejectionReason: verification.rejection_reason || null,
        createdAt: verification.created_at,
        processedAt: verification.processed_at,
        processedBy: verification.processed_by || null,
    }));
}

export async function processVerificationRequest(values: z.infer<typeof processVerificationSchema>) {
    const { user } = await getAuthenticatedUser('admin');
    const supabaseAdmin = getSupabaseAdminClient();
    const { verificationId, action, rejectionReason } = values;

    // Check if verification exists and is pending
    const { data: verification, error: fetchError } = await supabaseAdmin
        .from('broker_verifications')
        .select('*')
        .eq('id', verificationId)
        .single();
    
    if (fetchError) {
        throw new Error(`Verification request not found: ${fetchError.message}`);
    }

    if (verification.status !== 'pending') {
        throw new Error("This verification request has already been processed");
    }

    const updateData: any = {
        status: action === 'approve' ? 'approved' : 'rejected',
        processed_at: new Date().toISOString(),
    };

    if (action === 'reject') {
        if (!rejectionReason) {
            throw new Error("Rejection reason is required");
        }
        updateData.rejection_reason = rejectionReason;
    }

    const { error: updateError } = await supabaseAdmin
        .from('broker_verifications')
        .update(updateData)
        .eq('id', verificationId);

    if (updateError) {
        throw new Error(`Failed to update verification: ${updateError.message}`);
    }

    revalidatePath('/admin/verifications');
    revalidatePath('/broker/verification');
    revalidatePath('/broker/dashboard');
}

export async function manageBrokerWallet(values: z.infer<typeof manageWalletSchema>) {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    const { brokerId, type, amount, walletType, description, paymentMode, transactionId } = values;

    const increment = type === 'credit' ? amount : -amount;
    
    try {
        // Validate that the wallet exists first
        const { data: existingWallet, error: fetchError } = await supabaseAdmin
            .from('wallets')
            .select('*')
            .eq('owner_id', brokerId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 is "not found" which is expected for new wallets
            throw new Error(`Failed to fetch wallet: ${fetchError.message}`);
        }

        // If wallet doesn't exist, create it
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
            // Update existing wallet
            const { error: walletError } = await supabaseAdmin.rpc('upsert_wallet_balance', {
                wallet_id: brokerId,
                wallet_type: walletType,
                increment_amount: increment
            });

            if (walletError) {
                throw new Error(`Failed to update wallet: ${walletError.message}`);
            }
        }
        
        // Then create the transaction record
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

// Commission update schema
const CommissionUpdateSchema = z.object({
    plotId: z.string().min(1, "Plot ID is required"),
    commissionRate: z.number().min(0).max(100, "Commission rate must be between 0 and 100"),
    salePrice: z.number().min(0, "Sale price must be non-negative"),
});

export async function updateCommission(plotId: string, commissionRate: number, salePrice: number) {
    try {
        // Validate input
        const validatedData = CommissionUpdateSchema.parse({
            plotId,
            commissionRate,
            salePrice
        });

        // Authorize admin access
        await authorizeAdmin();
        const supabaseAdmin = getSupabaseAdminClient();

        // Get current plot data from Supabase
        const { data: existingPlot, error: fetchError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .eq('id', validatedData.plotId)
            .single();
        
        if (fetchError || !existingPlot) {
            throw new Error('Plot not found');
        }

        // Update the commission rate and sale price in Supabase
        const { error: updateError } = await supabaseAdmin
            .from('plots')
            .update({
                // Note: We need to add commission_rate column to plots table if needed
                // For now, update sale_price only since commission_rate is not in our Supabase schema
                sale_price: validatedData.salePrice,
            })
            .eq('id', validatedData.plotId);

        if (updateError) {
            throw new Error(`Failed to update plot: ${updateError.message}`);
        }

        // Revalidate the admin commissions page
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

// ========== BROKER REFERRAL ACTIONS ==========

export async function submitBrokerReferral(formData: {
    referredName: string;
    referredEmail: string;
    referredPhone: string;
    note?: string;
}) {
    const user = await getAuthenticatedUser();
    
    // Validate form data
    const validatedData = brokerReferralSubmissionSchema.parse(formData);
    
    try {
        // Check if email is already registered
        const supabaseAdmin = getSupabaseAdminClient();
        const { data: existingUser } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', validatedData.referredEmail)
            .single();
            
        if (existingUser) {
            throw new Error('This email is already registered in the system');
        }
        
        // Check if there's already a pending referral for this email
        const { data: existingReferral, error: referralCheckError } = await supabaseAdmin
            .from('broker_referrals')
            .select('id')
            .eq('referred_email', validatedData.referredEmail)
            .eq('status', 'pending')
            .single();
            
        if (referralCheckError && referralCheckError.code !== 'PGRST116') {
            throw new Error(`Error checking existing referral: ${referralCheckError.message}`);
        }
            
        if (existingReferral) {
            throw new Error('A pending referral for this email already exists');
        }
        
        // Get referrer details
        const { data: referrerProfile } = await supabaseAdmin
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.user.id)
            .single();
            
        if (!referrerProfile) {
            throw new Error('Referrer profile not found');
        }
        
        // Create referral record
        const { error: insertError } = await supabaseAdmin
            .from('broker_referrals')
            .insert({
                referrer_id: user.user.id,
                referrer_name: referrerProfile.full_name || 'Unknown',
                referrer_email: referrerProfile.email || '',
                referred_name: validatedData.referredName,
                referred_email: validatedData.referredEmail,
                referred_phone: validatedData.referredPhone,
                note: validatedData.note || null,
                status: 'pending',
            });

        if (insertError) {
            throw new Error(`Failed to create referral: ${insertError.message}`);
        }
        
        revalidatePath('/broker/referral');
        
        return { 
            success: true, 
            message: 'Referral submitted successfully! Admin will review and approve.' 
        };
        
    } catch (error) {
        logger.error('Error submitting referral:', error);
        if (error instanceof z.ZodError) {
            throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to submit referral');
    }
}

export async function getBrokerReferrals(brokerId?: string) {
    const user = await getAuthenticatedUser();
    const supabaseAdmin = getSupabaseAdminClient();
    
    try {
        let query = supabaseAdmin.from('broker_referrals').select('*');
        
        if (brokerId) {
            query = query.eq('referrer_id', brokerId);
        }
        
        const { data: referrals, error } = await query
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            throw new Error(`Failed to fetch referrals: ${error.message}`);
        }

        // Map database fields to frontend expected format
        const mappedReferrals = (referrals || []).map(referral => ({
            id: referral.id,
            referrerId: referral.referrer_id || '',
            referrerName: referral.referrer_name || '',
            referrerEmail: referral.referrer_email || '',
            referredName: referral.referred_name || '',
            referredEmail: referral.referred_email || '',
            referredPhone: referral.referred_phone || '',
            note: referral.note || null,
            status: referral.status || 'pending',
            createdAt: referral.created_at || '',
            processedAt: referral.processed_at || null,
            processedBy: referral.processed_by || null,
            rejectionReason: referral.rejection_reason || null,
            newBrokerId: referral.new_broker_id || null,
        }));

        return mappedReferrals;
        
    } catch (error) {
        logger.error('Error fetching referrals:', error);
        // Return empty array instead of throwing error to prevent UI crashes
        return [];
    }
}

export async function processReferralRequest(formData: {
    referralId: string;
    action: 'approve' | 'reject';
    rejectionReason?: string;
    username?: string;
    password?: string;
    role?: 'broker';
    referredName?: string;
    referredEmail?: string;
    referredPhone?: string;
    referrerId?: string;
    referrerName?: string;
}) {
    await authorizeAdmin();
    
    const validatedData = processReferralSchema.parse(formData);
    
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: referralData, error: fetchError } = await supabaseAdmin
            .from('broker_referrals')
            .select('*')
            .eq('id', validatedData.referralId)
            .single();
        
        if (fetchError) {
            throw new Error(`Referral not found: ${fetchError.message}`);
        }
        
        if (referralData.status !== 'pending') {
            throw new Error('Referral has already been processed');
        }
        
        if (validatedData.action === 'approve') {
            if (!validatedData.username || !validatedData.password) {
                throw new Error('Username and password are required for approval');
            }
            
            // Validate required fields from referral data
            if (!referralData.referred_name || !referralData.referred_email) {
                throw new Error('Referral data is incomplete - missing name or email');
            }
            
            // Create auth user
            const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: referralData.referred_email,
                password: validatedData.password,
                email_confirm: true,
                user_metadata: {
                    full_name: referralData.referred_name,
                    role: 'broker',
                    phone: referralData.referred_phone || '',
                }
            });
            
            if (authError || !newUser) {
                throw new Error(`Failed to create user account: ${authError?.message}`);
            }
            
            // Create profile
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: newUser.user.id,
                    name: referralData.referred_name, // for legacy/NOT NULL constraint
                    full_name: referralData.referred_name,
                    email: referralData.referred_email,
                    role: 'broker',
                    phone: referralData.referred_phone || '',
                    sponsorid: referralData.referrer_id, // Set the referrer as sponsor
                });
                
            if (profileError) {
                // Cleanup: delete the auth user if profile creation fails
                await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
                throw new Error(`Failed to create user profile: ${profileError.message}`);
            }
            
            // Create wallet for new broker
            const { error: walletError } = await supabaseAdmin
                .from('wallets')
                .insert({
                    owner_id: newUser.user.id,
                    direct_sale_balance: 0,
                    downline_sale_balance: 0,
                    total_balance: 0,
                });
                
            if (walletError) {
                // Cleanup: delete the auth user and profile if wallet creation fails
                await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
                throw new Error(`Failed to create wallet: ${walletError.message}`);
            }
            
            // Update referral with approval details
            const { error: updateError } = await supabaseAdmin
                .from('broker_referrals')
                .update({
                    status: 'approved',
                    processed_at: new Date().toISOString(),
                    username: validatedData.username,
                    password: validatedData.password,
                })
                .eq('id', validatedData.referralId);

            if (updateError) {
                throw new Error(`Failed to update referral: ${updateError.message}`);
            }
            
            revalidatePath('/admin/referrals');
            return { 
                success: true, 
                message: `Referral approved! New broker account created for ${referralData.referred_name}` 
            };
            
        } else {
            // Reject referral
            const { error: rejectError } = await supabaseAdmin
                .from('broker_referrals')
                .update({
                    status: 'rejected',
                    processed_at: new Date().toISOString(),
                    rejection_reason: validatedData.rejectionReason || 'No reason provided',
                })
                .eq('id', validatedData.referralId);

            if (rejectError) {
                throw new Error(`Failed to reject referral: ${rejectError.message}`);
            }
            
            revalidatePath('/admin/referrals');
            return { 
                success: true, 
                message: 'Referral rejected successfully' 
            };
        }
        
    } catch (error) {
        logger.error('Error processing referral:', error);
        if (error instanceof z.ZodError) {
            throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to process referral');
    }
}

// ========== COMMISSION DISTRIBUTION ACTIONS ==========

export async function processCommissionCalculation(
    sellerId: string, 
    saleAmount: number, 
    plotData?: any,
    preservedTimestamps?: Map<string, string> // Optional: Map of receiver_level -> original timestamp
) {
    try {
        // Validate inputs
        if (!sellerId || typeof sellerId !== 'string') {
            throw new Error('Invalid seller ID provided');
        }
        if (!saleAmount || typeof saleAmount !== 'number' || isNaN(saleAmount) || saleAmount <= 0) {
            throw new Error('Invalid sale amount provided. Must be a positive number.');
        }

        const supabaseAdmin = getSupabaseAdminClient();
        
        // IMPORTANT: Check if commission already exists for this plot to prevent duplicates
        // Skip this check if we're recalculating (preservedTimestamps provided)
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
        
        // Get seller profile
        logger.dev('Looking for seller profile with ID:', sellerId);
        
        // Try to fetch profile with uplineId, fall back to basic profile if uplineId doesn't exist
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
            // If uplineId column doesn't exist, try without it
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
            
        if (!sellerProfile) {
            logger.error('No seller profile found for ID:', sellerId);
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
        
        // If no upline system is set up, just process direct commission for the seller
        if (!currentUplineId) {
            logger.dev('No upline structure found, processing only direct commission for seller.');
        }
        
        // Commission amounts for each level (GAJ-BASED SYSTEM)
        // Direct: ₹1,000 per gaj | Level 1: ₹200 per gaj | Level 2: ₹50 per gaj
        // Get plot size from saleAmount parameter (which contains the plot area in gaj)
        // NOTE: For gaj-based system, saleAmount parameter actually contains plot size in gaj
        const plotSizeInGaj = saleAmount; // This is plot area in gaj
        
        // Calculate seller's direct sale commission using gaj-based rates
        const sellerDirectCommission = calculateCommission('direct', plotSizeInGaj);
        
        logger.dev(`💰 Calculating seller commission (GAJ-BASED): ${plotSizeInGaj} gaj × ₹${GAJ_COMMISSION_RATES.direct}/gaj = ₹${sellerDirectCommission}`);
        
        // Use RPC function to update or create seller's wallet with full plot details
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
            
            // Fallback: Get existing wallet and increment
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

        // Create transaction record for seller's direct commission
        // Preserve timestamp if this is a recalculation (level 1 is direct sale)
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
        // Recalculation mode: attempt UPDATE of existing transaction instead of inserting a new one
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
                // Update amount & description only – created_at protected by trigger
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
            // ORIGINAL CALCULATION: check if RPC already created seller transaction
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

        // Calculate commissions for up to 2 levels (Level 3+ gets 0%)
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
                // If uplineId column doesn't exist, try without it
                const { data } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name')
                    .eq('id', currentUplineId)
                    .single();
                uplineProfile = data;
            }
                
            if (!uplineProfile) break;
            
            // Calculate upline commission using gaj-based rates
            let commissionAmount = 0;
            if (level === 1) {
                commissionAmount = calculateCommission('level1', plotSizeInGaj);
                logger.dev(`💰 Level ${level} upline commission: ${plotSizeInGaj} gaj × ₹${GAJ_COMMISSION_RATES.level1}/gaj = ₹${commissionAmount} for ${uplineProfile.full_name}`);
            } else if (level === 2) {
                commissionAmount = calculateCommission('level2', plotSizeInGaj);
                logger.dev(`💰 Level ${level} upline commission: ${plotSizeInGaj} gaj × ₹${GAJ_COMMISSION_RATES.level2}/gaj = ₹${commissionAmount} for ${uplineProfile.full_name}`);
            } else {
                // Level 3+ no commission
                logger.dev(`💰 Level ${level} upline: No commission (only levels 1-2 receive commissions)`);
                break;
            }
            
            // Create commission record with preserved timestamp if available
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
                percentage: null, // No percentage in gaj-based system
                sale_amount: plotSizeInGaj,
                plot_id: plotData?.id || null,
                project_name: plotData?.projectName || null,
            };
            
            // Preserve original timestamp if this is a recalculation
            if (preservedTimestamp) {
                commissionData.created_at = preservedTimestamp;
                logger.dev(`   📅 Using preserved timestamp: ${preservedTimestamp}`);
            }
            
            // Use UPSERT if we have preserved timestamps (recalculation scenario)
            // This updates existing records without changing created_at
            if (preservedTimestamps && preservedTimestamp) {
                // Try to find existing commission record by plot_id, receiver_id, and level
                const { data: existingComm } = await supabaseAdmin
                    .from('commissions')
                    .select('id, created_at')
                    .eq('plot_id', plotData?.id)
                    .eq('receiver_id', uplineProfile.id)
                    .eq('level', level)
                    .single();
                
                if (existingComm) {
                    // UPDATE existing record, keeping original created_at
                    const { error: updateError } = await supabaseAdmin
                        .from('commissions')
                        .update({
                            amount: commissionAmount,
                            percentage: null, // Gaj-based system, no percentage
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
                    // INSERT with preserved timestamp
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
                // Normal INSERT for first-time commission
                const { error: commissionError } = await supabaseAdmin
                    .from('commissions')
                    .insert(commissionData);
                    
                if (commissionError) {
                    logger.error(`Failed to create commission record for level ${level}:`, commissionError.message);
                    // Don't throw, just log
                } else {
                    logger.dev(`✅ Commission record created for level ${level}`);
                }
            }
            
            // Update upline's wallet using RPC function with full details
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
                
                // Fallback: Get existing wallet and increment
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
                    // Don't throw, continue with next level
                } else {
                    logger.dev(`✅ Upline wallet updated - Added ₹${commissionAmount} to downline balance`);
                }
            } else {
                logger.dev(`✅ Upline wallet updated via RPC - Added ₹${commissionAmount}`);
            }
            
            // Create / update upline transaction (avoid duplicates if RPC already inserted one)
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
                // Initial calculation: skip manual insert if one already exists (RPC likely created it)
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
            
            // Move to next level
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
        // Return partial success instead of throwing
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
        // Return empty array instead of throwing error to prevent UI crashes
        return [];
    }
}

// ========== COMMISSION & TRANSACTION REVERSAL (PLOT REVERSION) ==========
export async function reversePlotFinancials(plotId: string, originalPlot: any) {
    const supabaseAdmin = getSupabaseAdminClient();
    const reversedAt = new Date().toISOString();
    try {
        logger.dev('🧹 Starting financial reversal for plot:', { plotId, originalStatus: originalPlot.status });

        const sellerId = originalPlot.updated_by || originalPlot.broker_id;
        if (!sellerId) {
            logger.dev('⚠️ No seller/broker ID found on original plot; skipping direct commission reversal.');
        }

        // Reverse direct seller commission only if plot was sold
        if (originalPlot.status === 'sold' && sellerId) {
            const saleAmount = originalPlot.sold_amount || originalPlot.sale_price || 0;
            const commissionRate = originalPlot.commission_rate || 6;
            if (saleAmount > 0) {
                const directCommission = (saleAmount * commissionRate) / 100;
                logger.dev('🧮 Direct commission to reverse:', { saleAmount, commissionRate, directCommission });
                // Fetch seller wallet
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
                // Mark direct seller transaction reversed
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

        // Reverse upline commissions & wallets
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
                // Adjust upline wallet balances
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
                // Mark related transaction reversed
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
            // Mark commissions reversed in batch
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

        // Mark any remaining transactions (without wallet match) as reversed
        const { error: bulkTxErr } = await supabaseAdmin
            .from('transactions')
            .update({ status: 'reversed', is_reversed: true })
            .eq('plot_id', plotId)
            .eq('is_reversed', false);
        if (bulkTxErr) {
            logger.error('Failed bulk transaction reversal update:', bulkTxErr.message);
        }

        // Revalidate affected paths
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

// ========== BOOKED PLOTS AMOUNT SET/RECALC ==========
export async function setBookedPlotAmounts(plotId: string, totalAmount: number, bookingAmount?: number) {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    try {
        if (!plotId) throw new Error('plotId required');
        if (!totalAmount || totalAmount <= 0) throw new Error('totalAmount must be > 0');
        if (bookingAmount !== undefined && (bookingAmount < 0 || bookingAmount > totalAmount)) {
            throw new Error('bookingAmount must be >= 0 and <= totalAmount');
        }

        // Fetch plot and payments
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

        // Determine booking amount: prefer provided; else existing; else first payment (if any); else 0
        let effectiveBooking = bookingAmount !== undefined ? bookingAmount : (plot.booking_amount || 0);
        if (!effectiveBooking && payments && payments.length > 0) {
            effectiveBooking = Number(payments[0].amount_received || 0);
        }
        if (effectiveBooking > totalAmount) effectiveBooking = totalAmount; // clamp

        const remaining = Math.max(totalAmount - totalPaid, 0);
        const paidPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

        // Prepare update
        const update: any = {
            total_plot_amount: totalAmount,
            booking_amount: effectiveBooking || null,
            remaining_amount: remaining,
            paid_percentage: paidPercentage,
            updated_at: new Date().toISOString(),
        };

        // If threshold reached and not yet sold, update status
        const thresholdReached = paidPercentage >= 50;
        if (thresholdReached && plot.status.toLowerCase() === 'booked') {
            update.status = 'sold';
        }

        const { error: updateErr } = await supabaseAdmin
            .from('plots')
            .update(update)
            .eq('id', plotId);
        if (updateErr) throw new Error(`Failed to update plot amounts: ${updateErr.message}`);

        // Commission distribution if just transitioned and pending
        if (thresholdReached && plot.status.toLowerCase() === 'booked' && plot.commission_status === 'pending' && plot.broker_id) {
            try {
                // Use GAJ-BASED system for commission calculation
                const plotSizeInGaj = plot.area || 0;
                const result = await processCommissionCalculation(plot.broker_id, plotSizeInGaj, { id: plotId, projectName: 'N/A', plotNumber: 'N/A' });
                if (result.success) {
                    await supabaseAdmin
                        .from('plots')
                        .update({ commission_status: 'paid', updated_at: new Date().toISOString() })
                        .eq('id', plotId);
                }
            } catch (e) {
                logger.error('Commission distribution error after amount set:', e);
            }
        }

        // Revalidate affected pages
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

// ========================================
// MANUAL COMMISSION CALCULATION
// ========================================

export async function calculateCommissionForSoldPlots() {
    try {
        await authorizeAdmin();
        const supabaseAdmin = getSupabaseAdminClient();
        
        logger.dev('🔍 Starting commission recalculation for sold plots...');
        logger.dev('⚠️ This will clear all existing commissions and recalculate from scratch');
        
        // STEP 1: Clear all existing commissions and reset wallets
        logger.dev('🗑️ Clearing existing commissions and resetting wallets...');
        
        // Delete all commission records
        const { error: deleteCommissionsError } = await supabaseAdmin
            .from('commissions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        if (deleteCommissionsError) {
            console.warn('Warning: Could not delete existing commissions:', deleteCommissionsError.message);
        }
        
        // Delete all transaction records
        const { error: deleteTransactionsError } = await supabaseAdmin
            .from('transactions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        if (deleteTransactionsError) {
            console.warn('Warning: Could not delete existing transactions:', deleteTransactionsError.message);
        }
        
        // Reset all wallet balances to zero
        const { error: resetWalletsError } = await supabaseAdmin
            .from('wallets')
            .update({
                direct_sale_balance: 0,
                downline_sale_balance: 0,
                total_balance: 0,
                updated_at: new Date().toISOString()
            })
            .neq('owner_id', '00000000-0000-0000-0000-000000000000'); // Update all
        
        if (resetWalletsError) {
            console.warn('Warning: Could not reset wallets:', resetWalletsError.message);
        }
        
        logger.dev('✅ Cleared existing data, starting fresh calculation...');
        
        // STEP 2: Get all sold plots with broker information
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

        // Filter plots that have broker information (either broker_id or updated_by)
        const plotsWithBroker = soldPlots.filter(plot => plot.broker_id || plot.updated_by);
        
        logger.dev(`📊 Found ${soldPlots.length} sold plots, ${plotsWithBroker.length} have broker information`);
        let processedCount = 0;
        let totalCommissionDistributed = 0;

        // STEP 3: Recalculate commissions for each plot using GAJ-BASED system
        for (const plot of plotsWithBroker) {
            try {
                // Use broker_id for booked plots, fall back to updated_by for old sold plots
                const brokerId = plot.broker_id || plot.updated_by;
                // Use plot area (in gaj) for GAJ-BASED commission
                const plotSizeInGaj = plot.area || 0;
                
                logger.dev(`\n Processing plot ${plot.plot_number} (${plot.project_name})`);
                logger.dev(`   Plot Size: ${plotSizeInGaj} gaj`);
                logger.dev(`   Broker ID: ${brokerId}`);

                // Calculate commission using GAJ-BASED system
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
                // For logging, calculate what the gaj-based commission amounts are
                const totalCommissions = 
                    calculateCommission('direct', plotSizeInGaj) +
                    calculateCommission('level1', plotSizeInGaj) +
                    calculateCommission('level2', plotSizeInGaj);
                totalCommissionDistributed += totalCommissions;

            } catch (plotError) {
                logger.error(`Error processing plot ${plot.plot_number}:`, plotError);
                // Continue with other plots even if one fails
            }
        }

        logger.dev(`\n🎉 Commission calculation complete!`);
        logger.dev(`   Plots processed: ${processedCount}/${plotsWithBroker.length}`);
        logger.dev(`   Total commission distributed: ₹${totalCommissionDistributed.toFixed(2)}`);

        // Revalidate relevant pages
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

// Recalculate commission for a specific plot
export async function recalculateCommissionForPlot(plotId: string) {
    try {
        await authorizeAdmin();
        const supabaseAdmin = getSupabaseAdminClient();
        
        logger.dev(`🔄 Recalculating commission for plot: ${plotId}`);
        
        // Get the plot details
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

        // Use broker_id for booked plots, fall back to updated_by for old sold plots
        const brokerId = plot.broker_id || plot.updated_by;
        
        if (!brokerId) {
            throw new Error('No broker information found for this plot');
        }

        // Use plot area (in gaj) for GAJ-BASED commission calculation
        const plotSizeInGaj = plot.area || 0;
        
        if (!plotSizeInGaj || plotSizeInGaj <= 0) {
            throw new Error('No plot area (gaj) found for this plot');
        }

        logger.dev(`📊 Plot Details:`);
        logger.dev(`   Project: ${plot.project_name}`);
        logger.dev(`   Plot #: ${plot.plot_number}`);
        logger.dev(`   Plot Size: ${plotSizeInGaj} gaj`);
        logger.dev(`   Broker ID: ${brokerId}`);

        // STEP 1: Get existing commissions for this plot (to preserve timestamps and IDs)
        logger.dev(`� Fetching existing commissions for plot ${plot.plot_number}...`);
        
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

        // Store original timestamps - using wallet_id + level as key
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
                // Use wallet_id + wallet_type to identify transaction type
                // For direct sales: wallet_id_1 (level 1), for downline: wallet_id_level
                const level = tx.wallet_type === 'direct' ? 1 : (tx.description.match(/Level (\d+)/) || [0, 2])[1];
                const key = `${tx.wallet_id}_${level}`;
                // Only set if not already set by commission (prefer commission timestamp)
                if (!originalTimestamps.has(key)) {
                    originalTimestamps.set(key, tx.created_at);
                }
            }
        }

        // Subtract old amounts from wallet balances
        if (existingCommissions && existingCommissions.length > 0) {
            // Subtract old amounts from wallet balances
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

        // STEP 2 CHANGE: DO NOT DELETE transactions anymore – update amounts to preserve original created_at
        // We keep commissions and transactions to maintain historical timestamps.
        logger.dev(`🔐 Preserving existing commission & transaction timestamps (no deletion).`);

        // STEP 3: Recalculate commissions using GAJ-BASED system
        const result = await processCommissionCalculation(
            brokerId,
            plotSizeInGaj,
            {
                id: plot.id,
                projectName: plot.project_name,
                plotNumber: plot.plot_number
            },
            originalTimestamps // Pass preserved timestamps (used now for updates)
        );

        logger.dev(`Commission recalculation complete`);

        // Revalidate relevant pages
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

/**
 * Get all plots for public view
 */
export async function getPublicPlots(): Promise<Plot[]> {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        

        // Get all plots (no booking_date column)
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

        // Get all payment_history for these plots (to find booking date)
        const plotIds = plots.map(p => p.id);
        let bookingDates: Record<string, string | null> = {};
        if (plotIds.length > 0) {
            const { data: payments, error: payErr } = await supabaseAdmin
                .from('payment_history')
                .select('plot_id, payment_date')
                .in('plot_id', plotIds);
            if (!payErr && payments) {
                // Find earliest payment_date for each plot_id
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

// Get all plots function for inventory pages
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

        // Map database fields to expected application fields
        return plots.map(plot => ({
            id: plot.id,
            projectName: plot.project_name,
            type: plot.type || 'Residential', // Default if missing
            block: plot.block || 'A', // Default if missing
            plotNumber: plot.plot_number,
            status: plot.status,
            dimension: plot.dimension || `${Math.sqrt(plot.area || 1000).toFixed(0)}x${Math.sqrt(plot.area || 1000).toFixed(0)} ft`, // Calculate from area
            area: plot.area,
            buyerName: plot.buyer_name,
            buyerPhone: plot.buyer_phone,
            buyerEmail: plot.buyer_email,
            salePrice: plot.sale_price,
            saleDate: plot.sale_date,
            commissionRate: plot.commission_rate,
            brokerName: plot.broker_name || (plot.profiles ? plot.profiles.full_name : null),
            brokerId: plot.broker_id,
            sellerName: plot.seller_name,
            soldAmount: plot.sold_amount,
            createdAt: plot.created_at,
            updatedAt: plot.updated_at,
            updatedBy: plot.updated_by,
        }));
    } catch (error) {
        logger.error('Error in getPlots:', error);
        throw new Error(`Failed to get plots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// ============================================
// BOOKED PLOTS MANAGEMENT FUNCTIONS
// ============================================

/**
 * Get all booked plots with payment tracking information
 */
export async function getBookedPlots() {
    try {
        await authorizeAdmin();
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: plots, error } = await supabaseAdmin
            .from('plots')
            .select(`
                *,
                broker:profiles!plots_broker_id_fkey(id, full_name, email),
                payment_history(amount_received, payment_date)
            `)
            .ilike('status', 'booked')
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Error fetching booked plots:', error);
            throw new Error(`Failed to fetch booked plots: ${error.message}`);
        }

        logger.dev('📊 Fetched booked plots:', plots?.length || 0);
        if (plots && plots.length > 0) {
            logger.dev('📊 First plot data:', {
                id: plots[0].id,
                total_plot_amount: plots[0].total_plot_amount,
                booking_amount: plots[0].booking_amount,
                remaining_amount: plots[0].remaining_amount,
                tenure_months: plots[0].tenure_months,
                paid_percentage: plots[0].paid_percentage,
                status: plots[0].status,
            });
        }
        return plots || [];
    } catch (error) {
        logger.error('Error in getBookedPlots:', error);
        throw new Error(`Failed to get booked plots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get payment history for a specific plot
 */
export async function getPaymentHistory(plotId: string) {
    try {
        await authorizeAdmin();
        const supabaseAdmin = getSupabaseAdminClient();
        
        // Backfill: ensure an initial booking payment exists for legacy plots
        // where booking_amount was saved on plots but an entry wasn't inserted into payment_history
        await ensureInitialBookingPayment(plotId);
        
        const { data: payments, error } = await supabaseAdmin
            .from('payment_history')
            .select(`
                *,
                updater:profiles!payment_history_updated_by_fkey(full_name)
            `)
            .eq('plot_id', plotId)
            .order('payment_date', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch payment history: ${error.message}`);
        }

        return payments || [];
    } catch (error) {
        logger.error('Error in getPaymentHistory:', error);
        throw new Error(`Failed to get payment history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Ensure payment_history has an initial row for the booking amount.
 * This is a safety net for plots created before we started inserting the initial entry.
 */
async function ensureInitialBookingPayment(plotId: string) {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const { user } = await getAuthenticatedUser();

        // 1) Load plot minimal info
        const { data: plot, error: plotErr } = await supabaseAdmin
            .from('plots')
            .select('id, buyer_name, broker_id, booking_amount, created_at')
            .eq('id', plotId)
            .single();

        if (plotErr) {
            logger.error('ensureInitialBookingPayment: failed to load plot', plotErr);
            return;
        }
        if (!plot || !plot.booking_amount || plot.booking_amount <= 0) {
            // Nothing to backfill
            return;
        }

        // 2) Check if an initial record already exists
        const { data: existing, error: existErr } = await supabaseAdmin
            .from('payment_history')
            .select('id')
            .eq('plot_id', plotId)
            .eq('notes', 'Initial booking amount')
            .limit(1);

        if (existErr) {
            logger.error('ensureInitialBookingPayment: failed to check existing payment', existErr);
            return;
        }
        if (existing && existing.length > 0) {
            // Already present
            return;
        }

        // 3) Insert the initial booking payment
        const paymentDate = plot.created_at
            ? new Date(plot.created_at).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

        const { error: insertErr } = await supabaseAdmin
            .from('payment_history')
            .insert({
                plot_id: plotId,
                buyer_name: plot.buyer_name || 'N/A',
                broker_id: plot.broker_id || null,
                amount_received: plot.booking_amount,
                payment_date: paymentDate,
                notes: 'Initial booking amount',
                updated_by: user.id,
            });

        if (insertErr) {
            logger.error('ensureInitialBookingPayment: failed to insert initial booking payment', insertErr);
        } else {
            logger.dev('ensureInitialBookingPayment: inserted missing initial booking payment');
        }
    } catch (e) {
        logger.error('ensureInitialBookingPayment: unexpected error', e);
    }
}

/**
 * Add a new payment to a booked plot
 * Automatically updates paid_percentage and triggers status change to 'Sold' if >= 50%
 */
export async function addPaymentToPlot(values: z.infer<typeof import('./schema').addPaymentSchema>) {
    try {
        const { user } = await getAuthenticatedUser('admin');
        const supabaseAdmin = getSupabaseAdminClient();
        
        // Get plot details
        const { data: plot, error: plotError } = await supabaseAdmin
            .from('plots')
            .select('id, buyer_name, broker_id, total_plot_amount, status')
            .eq('id', values.plotId)
            .single();

        if (plotError || !plot) {
            throw new Error('Plot not found');
        }

        if (plot.status.toLowerCase() !== 'booked') {
            throw new Error('Can only add payments to booked plots');
        }

        // Insert payment record
        const { data: payment, error: paymentError } = await supabaseAdmin
            .from('payment_history')
            .insert({
                plot_id: values.plotId,
                buyer_name: plot.buyer_name || 'N/A',
                broker_id: plot.broker_id,
                amount_received: values.amountReceived,
                payment_date: values.paymentDate,
                notes: values.notes,
                updated_by: user.id,
            })
            .select()
            .single();

        if (paymentError) {
            throw new Error(`Failed to add payment: ${paymentError.message}`);
        }

        // The trigger function will automatically:
        // 1. Update remaining_amount and paid_percentage
        // 2. Change status to 'Sold' if paid_percentage >= 50%

        // Wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));


        // Check updated plot status and paid percentage
        const { data: updatedPlot, error: checkError } = await supabaseAdmin
            .from('plots')
            .select('status, paid_percentage, commission_status, broker_id, total_plot_amount, plot_number, project_name')
            .eq('id', values.plotId)
            .single();

        if (checkError) {
            logger.error('❌ Error checking plot status:', checkError);
        } else {
            logger.dev('📊 Plot status after payment:', {
                plotId: values.plotId,
                status: updatedPlot?.status,
                paidPercentage: updatedPlot?.paid_percentage,
                commissionStatus: updatedPlot?.commission_status,
                brokerId: updatedPlot?.broker_id,
            });

            // Automatically trigger commission distribution at 50%+ payment if not already paid
            if (
                Number(updatedPlot?.paid_percentage) >= 50 &&
                updatedPlot?.commission_status === 'pending'
            ) {
                logger.dev('🎯 Payment reached 50%! Triggering commission distribution...');
                await triggerCommissionDistribution(values.plotId);
            } else if (updatedPlot?.commission_status === 'paid') {
                logger.dev('✅ Commission already paid');
            } else {
                logger.dev(`📝 Plot still in ${updatedPlot?.status} status (${updatedPlot?.paid_percentage}% paid)`);
            }
        }

        revalidatePath('/admin/booked-plots');
        revalidatePath('/admin/inventory');
        revalidatePath('/admin/brokers');
        revalidatePath('/admin/associates');
        revalidatePath('/broker/booked-plots');
        revalidatePath('/broker/sold-plots');
        revalidatePath('/broker/inventory');
        
        return payment;
    } catch (error) {
        logger.error('Error in addPaymentToPlot:', error);
        throw new Error(`Failed to add payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Trigger commission distribution when plot becomes Sold
 * Uses existing MLM commission logic (6%, 2%, 0.5%)
 */
async function triggerCommissionDistribution(plotId: string) {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        
        // Get plot details with broker information
        const { data: plot, error: plotError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .eq('id', plotId)
            .single();

        if (plotError || !plot) {
            logger.error('❌ Plot not found:', plotError);
            throw new Error('Plot not found');
        }

        const soldAmount = plot.total_plot_amount;
        const brokerId = plot.broker_id;

        if (!soldAmount || !brokerId) {
            logger.error('❌ Missing required data:', { soldAmount, brokerId });
            throw new Error('Missing required plot information for commission calculation');
        }

        logger.dev(`💰 Triggering commission distribution for plot ${plotId}:`, {
            project: plot.project_name,
            plotNumber: plot.plot_number,
            soldAmount,
            brokerId,
            status: plot.status,
            commissionStatus: plot.commission_status
        });

        // Use the existing commission calculation function with GAJ-BASED system
        // Pass plot area (in gaj) instead of amount
        const plotSizeInGaj = plot.area || 0;
        const result = await processCommissionCalculation(brokerId, plotSizeInGaj, {
            id: plot.id,
            projectName: plot.project_name,
            plotNumber: plot.plot_number
        });

        if (result.success) {
            // Mark commission as paid
            await supabaseAdmin
                .from('plots')
                .update({ commission_status: 'paid' })
                .eq('id', plotId);

            logger.dev(`✅ Commission distributed successfully for plot ${plot.plot_number}:`, {
                totalDistributed: result.totalDistributed,
                sellerCommission: result.sellerCommission,
                uplineCommissions: result.uplineCommissions
            });
        } else {
            logger.error('❌ Commission calculation failed:', result.error);
            throw new Error(`Commission calculation failed: ${result.error}`);
        }

        // Revalidate broker pages to show updated balances and plot status
        revalidatePath('/admin/brokers');
        revalidatePath('/admin/associates');
        revalidatePath('/broker/wallets');
        revalidatePath('/broker/dashboard');
        revalidatePath('/broker/booked-plots');
        revalidatePath('/broker/sold-plots');
        revalidatePath('/broker/inventory');

    } catch (error) {
        logger.error('❌ Error in triggerCommissionDistribution:', error);
        // Don't throw - just log the error so the payment can still be recorded
        logger.error(`Failed to distribute commission for plot ${plotId}, but payment was recorded`);
    }
}

// ============================================
// END BOOKED PLOTS MANAGEMENT
// ========== BOOKED PLOT CANCELLATION ==========
export async function cancelBookedPlot(plotId: string) {
    await authorizeAdmin(); // Only admins can cancel bookings (adjust if brokers need access)
    const supabaseAdmin = getSupabaseAdminClient();
    try {
        const { data: plot, error: fetchErr } = await supabaseAdmin
            .from('plots')
            .select('*')
            .eq('id', plotId)
            .single();
        if (fetchErr || !plot) throw new Error('Plot not found');
        if (plot.status !== 'booked') throw new Error('Only booked plots can be cancelled');
        if (plot.paid_percentage !== null && plot.paid_percentage >= 50) {
            throw new Error('Cannot cancel booking: paid percentage >= 50%');
        }

        logger.dev('🚫 Cancelling booked plot:', { plotId, paid_percentage: plot.paid_percentage });

        // Reset booking-related fields and status
        const { user } = await getAuthenticatedUser();
        const updatePayload = {
            status: 'available',
            buyer_name: null,
            buyer_phone: null,
            buyer_email: null,
            sale_date: null,
            sold_amount: null,
            commission_rate: null,
            broker_id: null,
            broker_name: null,
            booking_amount: null,
            remaining_amount: null,
            paid_percentage: null,
            tenure_months: null,
            total_plot_amount: null,
            updated_by: user.id,
        } as any;

        const { error: updateErr } = await supabaseAdmin
            .from('plots')
            .update(updatePayload)
            .eq('id', plotId);
        if (updateErr) throw new Error(`Failed to cancel booking: ${updateErr.message}`);

        // Revalidate relevant paths
        revalidatePath('/admin/inventory');
        revalidatePath('/broker/inventory');
        revalidatePath('/investor/dashboard');

        return { success: true, message: 'Booked plot cancelled and reset to available' };
    } catch (error) {
        logger.error('❌ Error cancelling booked plot:', error);
        return { success: false, message: (error as Error).message };
    }
}
// ============================================

// Testimonial functions for testimonials pages
export async function getTestimonials() {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: testimonials, error } = await supabaseAdmin
            .from('testimonials')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch testimonials: ${error.message}`);
        }

        return testimonials || [];
    } catch (error) {
        logger.error('Error in getTestimonials:', error);
        throw new Error(`Failed to get testimonials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function createTestimonial(testimonialData: any) {
    try {
        await authorizeAdmin();
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: testimonial, error } = await supabaseAdmin
            .from('testimonials')
            .insert({
                ...testimonialData,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create testimonial: ${error.message}`);
        }

        revalidatePath('/admin/testimonials');
        return testimonial;
    } catch (error) {
        logger.error('Error in createTestimonial:', error);
        throw new Error(`Failed to create testimonial: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function updateTestimonial(id: string, updates: any) {
    try {
        await authorizeAdmin();
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: testimonial, error } = await supabaseAdmin
            .from('testimonials')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update testimonial: ${error.message}`);
        }

        revalidatePath('/admin/testimonials');
        return testimonial;
    } catch (error) {
        logger.error('Error in updateTestimonial:', error);
        throw new Error(`Failed to update testimonial: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function deleteTestimonial(id: string) {
    try {
        await authorizeAdmin();
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { error } = await supabaseAdmin
            .from('testimonials')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete testimonial: ${error.message}`);
        }

        revalidatePath('/admin/testimonials');
        return { success: true };
    } catch (error) {
        logger.error('Error in deleteTestimonial:', error);
        throw new Error(`Failed to delete testimonial: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function submitTestimonial(testimonialData: any) {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: testimonial, error } = await supabaseAdmin
            .from('testimonials')
            .insert({
                ...testimonialData,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to submit testimonial: ${error.message}`);
        }

        return testimonial;
    } catch (error) {
        logger.error('Error in submitTestimonial:', error);
        throw new Error(`Failed to submit testimonial: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function submitContactForm(formData: any) {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: contact, error } = await supabaseAdmin
            .from('contacts')
            .insert({
                ...formData,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to submit contact form: ${error.message}`);
        }

        // Send WhatsApp notification
        try {
            const whatsappMessage = `New Contact Form Submission:\n\nName: ${formData.firstName} ${formData.lastName}\nEmail: ${formData.email}\nPhone: ${formData.phone || 'Not provided'}\n\nMessage:\n${formData.message}`;
            
            // Format message for WhatsApp URL (encode for URL)
            const encodedMessage = encodeURIComponent(whatsappMessage);
            const whatsappNumber = '918810317477'; // +91 88103 17477 without +
            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
            
            logger.info(`WhatsApp notification available at: ${whatsappUrl}`);
        } catch (whatsappError) {
            // Log WhatsApp error but don't throw - contact form should still succeed
            logger.error('Error preparing WhatsApp notification:', whatsappError);
        }

        return contact;
    } catch (error) {
        logger.error('Error in submitContactForm:', error);
        throw new Error(`Failed to submit contact form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Dashboard Analytics Functions

export async function getDashboardAnalytics(filters?: { startDate?: string; endDate?: string; brokerId?: string }) {
    await authorizeAdmin();
    
    try {
        // Get date range for filtering
        const startDate = filters?.startDate ? new Date(filters.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
        const endDate = filters?.endDate ? new Date(filters.endDate) : new Date();
        
        // Fetch all sold plots (sales data) from Supabase
        const supabaseAdmin = getSupabaseAdminClient();
        let salesQuery = supabaseAdmin
            .from('plots')
            .select('*')
            .eq('status', 'sold');
        
        if (filters?.brokerId) {
            salesQuery = salesQuery.eq('broker_id', filters.brokerId);
        }
        
        const { data: salesData, error: salesError } = await salesQuery;
        
        if (salesError) {
            throw new Error(`Failed to fetch sales data: ${salesError.message}`);
        }
        
        const allSales = (salesData || []).map(data => ({
            id: data.id,
            plotId: data.id,
            projectName: data.project_name || '',
            brokerId: data.broker_id || '',
            brokerName: data.broker_name || '',
            amount: data.sale_price || data.sold_amount || 0,
            saleDate: new Date(data.updated_at || data.created_at || new Date()),
            buyerName: data.buyer_name || '',
            commissionRate: data.commission_rate || 0,
            createdAt: new Date(data.created_at || new Date()),
        }));
        
        // Filter sales by date range
        const filteredSales = allSales.filter(sale => {
            const saleDate = new Date(sale.saleDate);
            return saleDate >= startDate && saleDate <= endDate;
        });
        
        // Fetch all commissions from Supabase
        const { data: commissionsData, error: commissionsError } = await supabaseAdmin
            .from('commissions')
            .select('*');
            
        if (commissionsError) {
            throw new Error(`Failed to fetch commissions: ${commissionsError.message}`);
        }
        
        const allCommissions = (commissionsData || []).map(data => ({
            id: data.id,
            saleId: data.sale_id || '',
            receiverId: data.receiver_id || '',
            receiverName: data.receiver_name || '',
            amount: data.amount || 0,
            level: data.level || 1,
            percentage: data.percentage || 0,
            createdAt: new Date(data.created_at || new Date()),
        }));
        
        // Filter commissions by date range
        const filteredCommissions = allCommissions.filter(commission => {
            const commissionDate = new Date(commission.createdAt);
            return commissionDate >= startDate && commissionDate <= endDate;
        });
        
        // Calculate summary metrics
        const totalSales = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);
        const totalCommissionPaid = filteredCommissions.reduce((sum, commission) => sum + commission.amount, 0);
        const companyTurnover = totalSales - totalCommissionPaid;
        const totalPlotsSold = filteredSales.length;
        
        // Get ALL brokers connected to company (direct or indirect)
        // In MLM system, all registered brokers are considered "active" as they are part of the network
        let activeBrokers = 0;
        
        try {
            // Count ALL brokers with role 'broker' - they are all connected to the company
            const { data: allBrokerProfiles, error: allBrokersError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('role', 'broker');
            
            if (!allBrokersError && allBrokerProfiles) {
                activeBrokers = allBrokerProfiles.length;
            }
        } catch (error) {
            logger.dev('Error fetching all broker profiles:', error);
            // Fallback: count unique brokers from sales and commissions if Supabase fails
            const brokersFromSales = new Set(filteredSales.map(sale => sale.brokerId));
            const brokersFromCommissions = new Set(filteredCommissions.map(commission => commission.receiverId));
            const allKnownBrokers = new Set([...brokersFromSales, ...brokersFromCommissions]);
            activeBrokers = allKnownBrokers.size;
        }
        
        // Group data by month for charts
        const monthlyMap = new Map<string, { totalSales: number; commissionPaid: number }>();
        
        // Process sales by month
        filteredSales.forEach(sale => {
            const date = new Date(sale.saleDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            
            if (!monthlyMap.has(monthKey)) {
                monthlyMap.set(monthKey, { totalSales: 0, commissionPaid: 0 });
            }
            
            const monthData = monthlyMap.get(monthKey)!;
            monthData.totalSales += sale.amount;
        });
        
        // Process commissions by month
        filteredCommissions.forEach(commission => {
            const date = new Date(commission.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyMap.has(monthKey)) {
                monthlyMap.set(monthKey, { totalSales: 0, commissionPaid: 0 });
            }
            
            const monthData = monthlyMap.get(monthKey)!;
            monthData.commissionPaid += commission.amount;
        });
        
        // Convert to monthly data array and sort by month
        const monthlyData = Array.from(monthlyMap.entries())
            .map(([month, data]) => {
                const [year, monthNum] = month.split('-');
                const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                
                return {
                    month,
                    monthName,
                    totalSales: data.totalSales,
                    commissionPaid: data.commissionPaid,
                    companyTurnover: data.totalSales - data.commissionPaid,
                };
            })
            .sort((a, b) => a.month.localeCompare(b.month));
        
        return {
            summary: {
                totalSales,
                totalCommissionPaid,
                companyTurnover,
                totalPlotsSold,
                activeBrokers,
            },
            monthlyData,
            filters: filters || {},
        };
        
    } catch (error) {
        logger.error('Error fetching dashboard analytics:', error);
        throw new Error('Failed to fetch dashboard analytics');
    }
}

export async function getBrokersList() {
    await authorizeAdmin();
    
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const { data: brokers, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'broker')
            .order('full_name');
        
        if (error) {
            throw new Error('Failed to fetch brokers list');
        }
        
        return brokers || [];
        
    } catch (error) {
        logger.error('Error fetching brokers list:', error);
        throw new Error('Failed to fetch brokers list');
    }
}

/**
 * Backfill missing initial booking payments for all booked plots
 * This fixes plots where booking_amount exists but payment_history entry is missing
 */
export async function backfillAllInitialBookingPayments() {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    const { user } = await getAuthenticatedUser();
    
    try {
        logger.dev('🔄 Starting backfill of initial booking payments...');
        
        // Get all booked plots
        const { data: plots, error: plotsError } = await supabaseAdmin
            .from('plots')
            .select('id, project_name, plot_number, buyer_name, broker_id, booking_amount, total_plot_amount, remaining_amount, paid_percentage, created_at, status');
        
        if (plotsError) {
            logger.error('Failed to fetch plots:', plotsError);
            throw new Error(`Failed to fetch plots: ${plotsError.message}`);
        }
        
        if (!plots || plots.length === 0) {
            logger.dev('✅ No plots found');
            return { success: true, processed: 0, created: 0, skipped: 0 };
        }
        
        logger.dev(`📊 Found ${plots.length} plots to check`);
        
        let created = 0;
        let skipped = 0;
        
        for (const plot of plots) {
            // Skip if no total_plot_amount or if status is not booked
            if (!plot.total_plot_amount || plot.total_plot_amount <= 0 || plot.status !== 'booked') {
                continue;
            }
            
            // Calculate how much has been paid (total - remaining)
            const amountPaid = (plot.total_plot_amount || 0) - (plot.remaining_amount || 0);
            
            logger.dev(`Checking plot ${plot.project_name} #${plot.plot_number}:`, {
                total: plot.total_plot_amount,
                remaining: plot.remaining_amount,
                amountPaid,
                booking_amount: plot.booking_amount
            });
            
            // Skip if nothing has been paid yet
            if (amountPaid <= 0) {
                logger.dev(`⏭️  Plot ${plot.plot_number} - No payments made yet (remaining = total)`);
                skipped++;
                continue;
            }
            
            // Check if payment_history already has records
            const { data: existingPayments, error: paymentError } = await supabaseAdmin
                .from('payment_history')
                .select('id, amount_received')
                .eq('plot_id', plot.id);
            
            if (paymentError) {
                logger.error(`Error checking payments for plot ${plot.plot_number}:`, paymentError);
                continue;
            }
            
            // If payments exist, skip
            if (existingPayments && existingPayments.length > 0) {
                logger.dev(`⏭️  Plot ${plot.plot_number} already has ${existingPayments.length} payment(s)`);
                skipped++;
                continue;
            }
            
            // Create initial payment based on amount already paid
            const paymentDate = plot.created_at
                ? new Date(plot.created_at).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            
            logger.dev(`✨ Creating payment for plot ${plot.plot_number}: ₹${amountPaid}`);
            
            const { error: insertError } = await supabaseAdmin
                .from('payment_history')
                .insert({
                    plot_id: plot.id,
                    buyer_name: plot.buyer_name || 'N/A',
                    broker_id: plot.broker_id || null,
                    amount_received: amountPaid,
                    payment_date: paymentDate,
                    notes: 'Initial booking amount (backfilled)',
                    updated_by: user.id,
                });
            
            if (insertError) {
                logger.error(`❌ Failed to create payment for plot ${plot.plot_number}:`, insertError);
            } else {
                logger.dev(`✅ Created initial payment for plot ${plot.plot_number}: ₹${amountPaid}`);
                created++;
            }
        }
        
        logger.dev(`🎉 Backfill complete: ${created} created, ${skipped} skipped out of ${plots.length} total`);
        
        return {
            success: true,
            processed: plots.length,
            created,
            skipped
        };
        
    } catch (error) {
        logger.error('Error in backfillAllInitialBookingPayments:', error);
        throw new Error(`Failed to backfill payments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get all booked plots for the current broker
 * Returns only plots booked by the current broker with payment history
 */
export async function getBrokerBookedPlots() {
    try {
        const { user } = await getAuthenticatedUser('broker');
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: plots, error } = await supabaseAdmin
            .from('plots')
            .select(`
                id,
                plot_number,
                project_name,
                buyer_name,
                status,
                total_plot_amount,
                booking_amount,
                remaining_amount,
                paid_percentage,
                tenure_months,
                commission_status,
                created_at,
                updated_at,
                payment_history(id, amount_received, payment_date, notes)
            `)
            .eq('broker_id', user.id)
            .ilike('status', 'booked')
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Error fetching broker booked plots:', error);
            throw new Error(`Failed to fetch booked plots: ${error.message}`);
        }

        // Ensure all calculated fields have defaults
        const enrichedPlots = (plots || []).map(plot => ({
            ...plot,
            total_plot_amount: plot.total_plot_amount || 0,
            booking_amount: plot.booking_amount || 0,
            remaining_amount: plot.remaining_amount || 0,
            paid_percentage: plot.paid_percentage || 0,
            commission_status: plot.commission_status || 'pending'
        }));

        logger.dev('📊 Fetched broker booked plots:', enrichedPlots?.length || 0);
        return enrichedPlots || [];
    } catch (error) {
        logger.error('Error in getBrokerBookedPlots:', error);
        throw new Error(`Failed to get booked plots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get all sold plots for the current broker
 * Returns only plots sold by the current broker with payment history
 */
export async function getBrokerSoldPlots() {
    try {
        const { user } = await getAuthenticatedUser('broker');
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: plots, error } = await supabaseAdmin
            .from('plots')
            .select(`
                id,
                plot_number,
                project_name,
                buyer_name,
                status,
                total_plot_amount,
                booking_amount,
                remaining_amount,
                paid_percentage,
                tenure_months,
                commission_status,
                created_at,
                updated_at,
                sale_price,
                payment_history(id, amount_received, payment_date, notes)
            `)
            .eq('broker_id', user.id)
            .ilike('status', 'sold')
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Error fetching broker sold plots:', error);
            throw new Error(`Failed to fetch sold plots: ${error.message}`);
        }

        // Ensure all calculated fields have defaults
        const enrichedPlots = (plots || []).map(plot => ({
            ...plot,
            total_plot_amount: plot.total_plot_amount || plot.sale_price || 0,
            booking_amount: plot.booking_amount || 0,
            remaining_amount: plot.remaining_amount || 0,
            paid_percentage: plot.paid_percentage || 0,
            // For sold plots, commission should always be paid
            commission_status: 'paid'
        }));

        logger.dev('📊 Fetched broker sold plots:', enrichedPlots?.length || 0);
        return enrichedPlots || [];
    } catch (error) {
        logger.error('Error in getBrokerSoldPlots:', error);
        throw new Error(`Failed to get sold plots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get all plots for the current broker (for performance tracking)
 * Returns all plots regardless of status with enriched data
 */
export async function getBrokerAllPlots() {
    try {
        const { user } = await getAuthenticatedUser('broker');
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: plots, error } = await supabaseAdmin
            .from('plots')
            .select(`
                id,
                plot_number,
                project_name,
                buyer_name,
                status,
                total_plot_amount,
                booking_amount,
                remaining_amount,
                paid_percentage,
                tenure_months,
                commission_status,
                created_at,
                updated_at,
                sale_price,
                payment_history(id, amount_received, payment_date, notes)
            `)
            .eq('broker_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Error fetching broker all plots:', error);
            throw new Error(`Failed to fetch plots: ${error.message}`);
        }

        // Ensure all calculated fields have defaults
        const enrichedPlots = (plots || []).map(plot => ({
            ...plot,
            total_plot_amount: plot.total_plot_amount || plot.sale_price || 0,
            booking_amount: plot.booking_amount || 0,
            remaining_amount: plot.remaining_amount || 0,
            paid_percentage: plot.paid_percentage || 0,
            commission_status: plot.commission_status || 'pending'
        }));

        logger.dev('📊 Fetched broker all plots:', enrichedPlots?.length || 0);
        return enrichedPlots || [];
    } catch (error) {
        logger.error('Error in getBrokerAllPlots:', error);
        throw new Error(`Failed to get plots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Calculate projected commission for booked plots (not yet at 50% payment)
 * Uses MLM commission rules: 6% direct, 2% level-1, 0.5% level-2
 * Returns the expected commission that will be received when plot reaches 50% payment
 */
export async function getProjectedCommissionWallet() {
    try {
        const { user } = await getAuthenticatedUser('broker');
        const supabaseAdmin = getSupabaseAdminClient();
        
        // Get all booked plots that are NOT yet at 50% payment
        const { data: bookedPlots, error } = await supabaseAdmin
            .from('plots')
            .select(`
                id,
                plot_number,
                project_name,
                area,
                paid_percentage
            `)
            .eq('broker_id', user.id)
            .ilike('status', 'booked')
            .lt('paid_percentage', 50);

        if (error) {
            logger.error('Error fetching booked plots for projection:', error);
            throw new Error(`Failed to fetch booked plots: ${error.message}`);
        }

        if (!bookedPlots || bookedPlots.length === 0) {
            return {
                totalProjectedAmount: 0,
                totalPlots: 0,
                plots: []
            };
        }

        // Calculate projected commission for each plot using GAJ-BASED system
        // Direct broker: ₹1,000 per gaj
        const projectedPlots = bookedPlots.map(plot => {
            const plotSizeInGaj = plot.area || 0;
            const projectedCommission = calculateCommission('direct', plotSizeInGaj);
            return {
                id: plot.id,
                plotNumber: plot.plot_number,
                projectName: plot.project_name,
                totalArea: plotSizeInGaj,
                paidPercentage: plot.paid_percentage || 0,
                projectedCommission: projectedCommission
            };
        });

        // Calculate totals
        const totalProjectedAmount = projectedPlots.reduce((sum, p) => sum + p.projectedCommission, 0);

        logger.dev('📊 Calculated projected commission (GAJ-BASED):', {
            brokerId: user.id,
            totalProjectedAmount,
            plotCount: projectedPlots.length,
            ratePerGaj: GAJ_COMMISSION_RATES.direct
        });

        return {
            totalProjectedAmount,
            totalPlots: projectedPlots.length,
            plots: projectedPlots
        };
    } catch (error) {
        logger.error('Error in getProjectedCommissionWallet:', error);
        throw new Error(`Failed to get projected commission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Gallery Management Functions
export async function getAdminGalleryImages() {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const authData = await getAuthenticatedUser('admin');
        
        if (!authData) {
            throw new Error('Unauthorized');
        }

        // Fetch all gallery images ordered by order_index
        const { data, error } = await supabaseAdmin
            .from('property_gallery')
            .select('*')
            .order('order_index', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data || [];
    } catch (error) {
        logger.error('Error in getAdminGalleryImages:', error);
        throw new Error(`Failed to fetch gallery images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function addGalleryImage(imageData: {
    project_name: string;
    title: string;
    description?: string;
    image_url: string;
    order_index?: number;
}) {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const authData = await getAuthenticatedUser('admin');
        
        if (!authData) {
            throw new Error('Unauthorized');
        }

        // Insert new gallery image
        const { data, error } = await supabaseAdmin
            .from('property_gallery')
            .insert({
                project_name: imageData.project_name,
                title: imageData.title,
                description: imageData.description || null,
                image_url: imageData.image_url,
                order_index: imageData.order_index || 0,
                is_active: true,
                created_by: authData.user.id,
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/admin/gallery');
        revalidatePath('/explore');

        return data;
    } catch (error) {
        logger.error('Error in addGalleryImage:', error);
        throw new Error(`Failed to add gallery image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function updateGalleryImage(id: string, imageData: Partial<{
    project_name: string;
    title: string;
    description: string;
    image_url: string;
    order_index: number;
    is_active: boolean;
}>) {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const authData = await getAuthenticatedUser('admin');
        
        if (!authData) {
            throw new Error('Unauthorized');
        }

        // Update gallery image
        const { data, error } = await supabaseAdmin
            .from('property_gallery')
            .update({
                ...imageData,
                updated_by: authData.user.id,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/admin/gallery');
        revalidatePath('/explore');

        return data;
    } catch (error) {
        logger.error('Error in updateGalleryImage:', error);
        throw new Error(`Failed to update gallery image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function deleteGalleryImage(id: string) {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const authData = await getAuthenticatedUser('admin');
        
        if (!authData) {
            throw new Error('Unauthorized');
        }

        // Delete gallery image
        const { error } = await supabaseAdmin
            .from('property_gallery')
            .delete()
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/admin/gallery');
        revalidatePath('/explore');

        return { success: true };
    } catch (error) {
        logger.error('Error in deleteGalleryImage:', error);
        throw new Error(`Failed to delete gallery image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// ============================================
// PLOT HISTORY / AUDIT TRAIL
// ============================================

/**
 * Get complete plot history for broker
 * Shows all plot status changes: booked -> sold -> cancelled
 * Immutable audit trail with no edits/deletions
 */
export async function getBrokerPlotHistory() {
    try {
        const { user } = await getAuthenticatedUser('broker');
        const supabaseAdmin = getSupabaseAdminClient();

        // Get all plots related to this broker
        const { data: plots, error } = await supabaseAdmin
            .from('plots')
            .select(`
                id,
                project_name,
                plot_number,
                plot_size_gaj,
                status,
                buyer_name,
                broker_name,
                booking_date,
                sale_date,
                total_plot_amount,
                paid_percentage,
                cancel_reason,
                cancelled_date,
                created_at,
                updated_at,
                payment_history
            `)
            .eq('broker_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch plot history: ${error.message}`);
        }

        return (plots || []).map(plot => ({
            id: plot.id,
            plot_id: plot.id,
            project_name: plot.project_name,
            plot_number: plot.plot_number,
            plot_size_gaj: plot.plot_size_gaj || 0,
            status: plot.status as 'available' | 'booked' | 'sold' | 'cancelled',
            buyer_name: plot.buyer_name,
            broker_name: plot.broker_name,
            booking_date: plot.booking_date,
            sale_date: plot.sale_date,
            total_amount: plot.total_plot_amount,
            paid_percentage: plot.paid_percentage,
            cancel_reason: plot.cancel_reason,
            cancelled_date: plot.cancelled_date,
            payment_history: plot.payment_history || [],
            created_at: plot.created_at,
            updated_at: plot.updated_at,
        }));
    } catch (error) {
        logger.error('Error fetching broker plot history:', error);
        throw new Error('Failed to fetch plot history');
    }
}

