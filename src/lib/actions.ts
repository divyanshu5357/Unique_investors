

'use server'

// Firebase imports removed - now using Supabase only
import type { PlotFormValues } from '@/components/inventory/PlotForm';
import { Plot, PlotSchema, Wallet, Transaction, WithdrawalRequest } from './schema';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { 
    getSupabaseAdminClient, 
    getAuthenticatedUser, 
    authorizeAdmin,
    buildDownlineTree,
    BrokerFormSchema,
    manageWalletSchema,
    BulkAddPlotsData
} from './serverUtils';
import { Broker, DownlineTreeData, TransactionRecord, WithdrawalRequestRecord, BrokerVerificationRecord } from './types';
import { withdrawalRequestSchema, processWithdrawalSchema, brokerVerificationSubmissionSchema, processVerificationSchema, brokerReferralSubmissionSchema, processReferralSchema } from './schema';

export async function ensureUserProfile(userId: string, userMetadata?: any) {
    const supabaseAdmin = await getSupabaseAdminClient();
    
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
    console.log('🔵 addPlot called with data:', data);
    await authorizeAdmin();

    const plotNumber = Number(data.plotNumber);
    if (isNaN(plotNumber)) {
        throw new Error('Invalid plot number provided.');
    }

    // Supabase will handle unique constraint with database-level constraint

    try {
        // Convert string numbers to actual numbers for numeric fields
        const processedData: any = { ...data };
        console.log('🔵 processedData before conversion:', processedData);
        
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
        const supabaseAdmin = await getSupabaseAdminClient();

        console.log('🟢 processedData after conversion:', {
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

        console.log('🟡 plotData to be inserted:', {
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
        if (processedData.status === 'sold' && processedData.brokerId && processedData.salePrice && processedData.commissionRate) {
            // Validate that we have valid numbers
            if (isNaN(processedData.salePrice) || processedData.salePrice <= 0) {
                throw new Error("Sale price must be a valid positive number");
            }
            if (isNaN(processedData.commissionRate) || processedData.commissionRate <= 0) {
                throw new Error("Commission rate must be a valid positive number");
            }
            
            // Calculate and distribute commission
            await processCommissionCalculation(processedData.brokerId, processedData.salePrice, {
                ...processedData,
                id: newPlot.id
            });
        }

        // If plot is being created as booked, add initial booking payment to payment_history
        console.log('💰 Checking if initial payment should be created:', {
            status: processedData.status,
            statusLower: processedData.status?.toLowerCase(),
            bookingAmount: processedData.bookingAmount,
            shouldCreate: processedData.status?.toLowerCase() === 'booked' && processedData.bookingAmount && processedData.bookingAmount > 0,
        });
        
        if (processedData.status?.toLowerCase() === 'booked' && processedData.bookingAmount && processedData.bookingAmount > 0) {
            console.log('💰 Creating initial payment_history entry:', {
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
                console.error('❌ Error creating initial payment:', paymentError);
                throw new Error(`Failed to create initial payment: ${paymentError.message}`);
            }
            
            console.log('✅ Initial payment created:', paymentEntry);
        }
        
        revalidatePath('/admin/inventory');
        revalidatePath('/broker/inventory');
        revalidatePath('/investor/dashboard');
        revalidatePath('/admin/commissions');
        revalidatePath('/admin/booked-plots');
    } catch (error) {
        console.error("Error adding plot:", error);
        throw error instanceof Error ? error : new Error("Failed to add plot due to a server error.");
    }
}

export async function updatePlot(id: string, data: Partial<PlotFormValues>) {
    console.log('🚀 updatePlot called with:', { id, data });
    
    await authorizeAdmin();
    const { user } = await getAuthenticatedUser();
    const supabaseAdmin = await getSupabaseAdminClient();

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
        
        console.log('📦 Original plot data:', originalPlot);

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
        if (processedData.plotNumber !== undefined) updateData.plot_number = processedData.plotNumber.toString();
        if (processedData.area !== undefined) updateData.area = processedData.area;
        if (processedData.facing !== undefined) updateData.facing = processedData.facing;
        if (processedData.status !== undefined) updateData.status = processedData.status;
        if (processedData.price !== undefined) updateData.price = processedData.price;
        if (processedData.salePrice !== undefined) updateData.sale_price = processedData.salePrice;
        if (processedData.buyerName !== undefined) updateData.buyer_name = processedData.buyerName;
        if (processedData.buyerPhone !== undefined) updateData.buyer_phone = processedData.buyerPhone;
        if (processedData.buyerEmail !== undefined) updateData.buyer_email = processedData.buyerEmail;
        if (processedData.saleDate !== undefined) updateData.sale_date = processedData.saleDate;
        // Booked plot fields
        if (processedData.totalPlotAmount !== undefined) updateData.total_plot_amount = processedData.totalPlotAmount;
        if (processedData.bookingAmount !== undefined) updateData.booking_amount = processedData.bookingAmount;
        if (processedData.tenureMonths !== undefined) updateData.tenure_months = processedData.tenureMonths;
        if (processedData.brokerId !== undefined) updateData.broker_id = processedData.brokerId;
        if (processedData.brokerName !== undefined) updateData.broker_name = processedData.brokerName;
        // Calculate remaining amount and paid percentage for booked plots
        if (processedData.totalPlotAmount !== undefined && processedData.bookingAmount !== undefined) {
            updateData.remaining_amount = processedData.totalPlotAmount - processedData.bookingAmount;
            updateData.paid_percentage = (processedData.bookingAmount / processedData.totalPlotAmount * 100);
        }

        // IMPORTANT: If plot is sold and brokerId is provided, use broker's ID as updated_by
        // This ensures the broker gets credit for the sale, not the admin who saved the form
        if (processedData.status === 'sold' && processedData.brokerId) {
            updateData.updated_by = processedData.brokerId;
            console.log(`🔄 Setting updated_by to broker: ${processedData.brokerId} (not admin: ${user.id})`);
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
        
        console.log('� PLOT UPDATE - Checking if commission calculation needed...');
        console.log('�🔍 Commission Check:', {
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
        
        // Simplified condition: if status is sold and we have the necessary data
        const shouldCalculateCommission = (
            processedData.status === 'sold' && 
            processedData.brokerId && 
            actualSaleAmount && 
            processedData.commissionRate &&
            actualSaleAmount > 0 &&
            processedData.commissionRate > 0
        );

        console.log('🎯 Should calculate commission?', shouldCalculateCommission);
        
        if (shouldCalculateCommission) {
            console.log('✅ Processing commission calculation...');
            
            // Validate that we have valid numbers
            if (isNaN(actualSaleAmount) || actualSaleAmount <= 0) {
                throw new Error("Sale amount must be a valid positive number");
            }
            if (isNaN(processedData.commissionRate) || processedData.commissionRate <= 0) {
                throw new Error("Commission rate must be a valid positive number");
            }
            
            // Process commission calculation asynchronously - don't block the response
            processCommissionCalculation(processedData.brokerId, actualSaleAmount, {
                ...originalPlot,
                ...processedData,
                id: id
            }).then(() => {
                console.log('✅ Commission calculation completed successfully');
                // Revalidate again after commission processing
                revalidatePath('/admin/commissions');
                revalidatePath('/admin/brokers');
                revalidatePath('/admin/associates');
                revalidatePath('/broker/wallets');
            }).catch((error) => {
                console.error('❌ Error in commission calculation:', error);
                // Don't throw - just log the error
            });
        } else {
            console.log('❌ Commission calculation skipped because:');
            if (!isSoldStatusUpdate) console.log('  - Plot status/broker info not being updated for commission calculation');
            if (!processedData.brokerId) console.log('  - No broker ID provided');
            if (!actualSaleAmount) console.log('  - No sale amount provided (checked both salePrice and soldAmount)');  
            if (!processedData.commissionRate) console.log('  - No commission rate provided');
        }
    } catch (error) {
        console.error("Error updating plot:", error);
        throw new Error("Failed to update plot due to a server error.");
    }
}

// Simple function to remove ALL duplicate plots - keep only unique project+plotNumber combinations
export async function removeDuplicatePlots() {
    await authorizeAdmin();
    const supabaseAdmin = await getSupabaseAdminClient();
    
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
        
        console.log(`\n=== DUPLICATE REMOVAL STARTED ===`);
        console.log(`Total plots found: ${allPlots.length}`);
        
        const uniquePlots = new Map<string, string>(); // key -> plotId to keep
        const duplicatesToDelete: string[] = [];
        
        allPlots.forEach(plot => {
            // Skip plots with missing critical data
            if (!plot.project_name || !plot.plot_number) {
                duplicatesToDelete.push(plot.id);
                console.log(`❌ Removing corrupt plot: ${plot.id} (missing project/plotNumber)`);
                return;
            }
            
            // Create simple unique key: project + plotNumber  
            const uniqueKey = `${plot.project_name}-${plot.plot_number}`;
            
            if (uniquePlots.has(uniqueKey)) {
                // This is a duplicate - delete it
                duplicatesToDelete.push(plot.id);
                console.log(`🔄 Removing duplicate: Plot ${plot.plot_number} in ${plot.project_name} (ID: ${plot.id})`);
            } else {
                // First occurrence - keep it
                uniquePlots.set(uniqueKey, plot.id);
                console.log(`✅ Keeping: Plot ${plot.plot_number} in ${plot.project_name} (ID: ${plot.id})`);
            }
        });
        
        console.log(`\n📊 SUMMARY:`);
        console.log(`- Unique plots to keep: ${uniquePlots.size}`);
        console.log(`- Duplicates to remove: ${duplicatesToDelete.length}`);
        
        // Delete all duplicates
        if (duplicatesToDelete.length > 0) {
            const { error: deleteError } = await supabaseAdmin
                .from('plots')
                .delete()
                .in('id', duplicatesToDelete);

            if (deleteError) {
                throw new Error(`Failed to delete duplicates: ${deleteError.message}`);
            }
            
            console.log(`✨ Successfully deleted ${duplicatesToDelete.length} duplicate plots`);
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
        console.error("❌ Error removing duplicates:", error);
        throw new Error("Failed to remove duplicate plots.");
    }
}

// Function to clean up corrupt/incomplete plot data
export async function cleanupCorruptPlots() {
    await authorizeAdmin();
    const supabaseAdmin = await getSupabaseAdminClient();
    
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
                console.log(`Found corrupt plot: ${plot.id}`, {
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
            
            console.log(`Successfully deleted ${corruptPlots.length} corrupt plots`);
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
        console.error("Error cleaning up corrupt plots:", error);
        throw new Error("Failed to cleanup corrupt plots.");
    }
}

// Function to analyze duplicates without deleting them
export async function analyzeDuplicatePlots() {
    await authorizeAdmin();
    const supabaseAdmin = await getSupabaseAdminClient();
    
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
        console.error("Error analyzing duplicate plots:", error);
        throw new Error("Failed to analyze duplicate plots.");
    }
}

export async function deletePlot(id: string) {
    await authorizeAdmin();
    const supabaseAdmin = await getSupabaseAdminClient();
    
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
            console.log('🗑️ Deleting sold plot, reversing commissions...');
            
            // Get all transactions related to this plot
            const { data: plotTransactions, error: txError } = await supabaseAdmin
                .from('transactions')
                .select('*')
                .eq('plot_id', id);

            if (!txError && plotTransactions && plotTransactions.length > 0) {
                console.log(`Found ${plotTransactions.length} transactions to reverse`);
                
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

                            console.log(`✅ Reversed ₹${tx.amount} from wallet (${tx.wallet_type})`);
                        }
                    }
                }

                // Delete all transactions related to this plot
                const { error: deleteTxError } = await supabaseAdmin
                    .from('transactions')
                    .delete()
                    .eq('plot_id', id);

                if (deleteTxError) {
                    console.error('Error deleting transactions:', deleteTxError);
                } else {
                    console.log('✅ Deleted all related transactions');
                }
            }

            // Delete commissions related to this plot
            const { error: deleteCommError } = await supabaseAdmin
                .from('commissions')
                .delete()
                .eq('plot_id', id);

            if (deleteCommError) {
                console.error('Error deleting commissions:', deleteCommError);
            } else {
                console.log('✅ Deleted all related commissions');
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

        console.log('✅ Plot deleted successfully');

        revalidatePath('/admin/inventory');
        revalidatePath('/broker/inventory');
        revalidatePath('/investor/dashboard');
        revalidatePath('/admin/associates');
    } catch (error) {
        console.error("Error deleting plot: ", error);
        throw new Error("Could not delete the plot.");
    }
}

export async function bulkAddPlots(data: BulkAddPlotsData) {
    await authorizeAdmin();
    const { user } = await getAuthenticatedUser();
    const supabaseAdmin = await getSupabaseAdminClient();

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
        console.error("Error during bulk add:", error);
        throw new Error("Failed to generate plots due to a database error.");
    }
}

export async function createBroker(values: z.infer<typeof BrokerFormSchema> & Partial<import('./types').BrokerReferralRecord>) {
    await authorizeAdmin();
    const supabaseAdmin = await getSupabaseAdminClient();

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
        console.error("Supabase create user failed:", authError);
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

    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert(profileData);

    if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`User created but failed to create profile: ${profileError.message}. The operation has been rolled back.`);
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
        console.log('Wallet may already exist or will be created on first access:', walletError.message);
        // Don't throw error here as wallet creation is not critical
    }

    revalidatePath('/admin/brokers');
    revalidatePath('/admin/associates');
    return { success: true };
}

export async function getBrokers(): Promise<Broker[]> {
    await authorizeAdmin();
    const supabaseAdmin = await getSupabaseAdminClient();

    const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'broker');

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
        console.log('Error fetching wallets:', walletsError.message);
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
            console.log(`Error fetching plots for broker ${broker.id}:`, plotsError.message);
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
    await authorizeAdmin();
    const supabaseAdmin = await getSupabaseAdminClient();
    
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) { 
        throw new Error(`Failed to delete broker from authentication: ${authError.message}`);
    }
    
    // Delete wallet from Supabase (will cascade delete due to foreign key constraint)
    const { error: walletError } = await supabaseAdmin
        .from('wallets')
        .delete()
        .eq('owner_id', userId);

    if (walletError) {
        console.log('Error deleting wallet (may not exist):', walletError.message);
        // Don't throw error as wallet deletion is not critical
    }
    
    revalidatePath('/admin/brokers');
    return { success: true };
}

export async function getDownlineTreeForBroker(brokerId: string): Promise<DownlineTreeData | null> {
    await authorizeAdmin(); 
    return buildDownlineTree(brokerId);
}

export async function getMyDownlineTree(): Promise<DownlineTreeData | null> {
    const { user } = await getAuthenticatedUser('broker');
    return buildDownlineTree(user.id);
}

export async function getBrokerWallets(): Promise<Wallet | null> {
    const { user } = await getAuthenticatedUser('broker');
    const supabaseAdmin = await getSupabaseAdminClient();

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
        console.log(`No wallet found for broker ${user.id}, creating one.`);
        
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
    const supabaseAdmin = await getSupabaseAdminClient();

    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, totalcommission, uplineId, mobile_number, address')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching broker profile:', error);
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
    const supabaseAdmin = await getSupabaseAdminClient();

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
    if (!wallet || wallet.totalBalance < values.amount) {
        throw new Error("Insufficient balance for this withdrawal request.");
    }

    // Get broker profile info
    const supabaseAdmin = await getSupabaseAdminClient();
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

    if (!profile) {
        throw new Error("Broker profile not found");
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
    const supabaseAdmin = await getSupabaseAdminClient();
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
        console.error("Error fetching transactions:", error);
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
        paymentMode: t.payment_mode || null,
        transactionId: t.reference_id,
        proofUrl: null,
        status: t.status || 'completed',
        note: null,
        processedBy: null,
        date: t.created_at || t.date,
        processedAt: t.created_at || t.date,
    }));
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
    const supabaseAdmin = await getSupabaseAdminClient();
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
    const supabaseAdmin = await getSupabaseAdminClient();
    
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
    const supabaseAdmin = await getSupabaseAdminClient();

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

        // Deduct amount from broker's wallet in Supabase using RPC
        const { error: walletError } = await supabaseAdmin.rpc('update_wallet_balance_withdrawal', {
            wallet_owner_id: withdrawalData.broker_id,
            withdrawal_amount: withdrawalData.amount
        });

        if (walletError) {
            throw new Error(`Failed to update wallet: ${walletError.message}`);
        }

        // Add withdrawal transaction record in Supabase
        const { error: transactionError } = await supabaseAdmin
            .from('transactions')
            .insert({
                user_id: withdrawalData.broker_id,
                type: 'withdrawal',
                amount: withdrawalData.amount,
                description: `Withdrawal approved - ${paymentType}`,
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
    const supabaseAdmin = await getSupabaseAdminClient();
    
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
    
    console.log('Attempting to update profile with:', updateData);
    
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select();

    if (updateError) {
        console.error('Error updating profile:', updateError);
        throw new Error(`Failed to update profile: ${updateError.message}`);
    }
    
    console.log('Profile updated successfully:', updatedProfile);
    
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
    const supabaseAdmin = await getSupabaseAdminClient();
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
    const supabaseAdmin = await getSupabaseAdminClient();
    
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
    const supabaseAdmin = await getSupabaseAdminClient();
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
    const supabaseAdmin = await getSupabaseAdminClient();
    const { brokerId, type, amount, walletType, description, paymentMode, transactionId } = values;

    const increment = type === 'credit' ? amount : -amount;
    
    try {
        // First update or create the wallet
        const { error: walletError } = await supabaseAdmin.rpc('upsert_wallet_balance', {
            wallet_id: brokerId,
            wallet_type: walletType,
            increment_amount: increment
        });

        if (walletError) {
            throw new Error(`Failed to update wallet: ${walletError.message}`);
        }
        
        // Then create the transaction record
        const { error: transactionError } = await supabaseAdmin
            .from('transactions')
            .insert({
                wallet_id: brokerId,
                wallet_type: walletType,
                type,
                amount,
                description,
                payment_mode: paymentMode || null,
                transaction_id: transactionId || null,
                proof_url: null, // Admin can add this later if needed
            });

        if (transactionError) {
            throw new Error(`Failed to create transaction: ${transactionError.message}`);
        }

        revalidatePath('/admin/brokers');
        revalidatePath('/broker/dashboard');
        revalidatePath('/broker/wallets');
    } catch (error) {
        console.error("Error managing wallet:", error);
        throw new Error("Failed to process wallet transaction.");
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
        const supabaseAdmin = await getSupabaseAdminClient();

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
        console.error("Error updating commission:", error);
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
        const supabaseAdmin = await getSupabaseAdminClient();
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
        console.error('Error submitting referral:', error);
        if (error instanceof z.ZodError) {
            throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to submit referral');
    }
}

export async function getBrokerReferrals(brokerId?: string) {
    const user = await getAuthenticatedUser();
    const supabaseAdmin = await getSupabaseAdminClient();
    
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
        console.error('Error fetching referrals:', error);
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
        const supabaseAdmin = await getSupabaseAdminClient();
        
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
        console.error('Error processing referral:', error);
        if (error instanceof z.ZodError) {
            throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to process referral');
    }
}

// ========== COMMISSION DISTRIBUTION ACTIONS ==========

export async function processCommissionCalculation(sellerId: string, saleAmount: number, plotData?: any) {
    try {
        // Validate inputs
        if (!sellerId || typeof sellerId !== 'string') {
            throw new Error('Invalid seller ID provided');
        }
        if (!saleAmount || typeof saleAmount !== 'number' || isNaN(saleAmount) || saleAmount <= 0) {
            throw new Error('Invalid sale amount provided. Must be a positive number.');
        }

        const supabaseAdmin = await getSupabaseAdminClient();
        
        // Get seller profile
        console.log('Looking for seller profile with ID:', sellerId);
        
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
            console.log('uplineId column not found, trying without it...');
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('full_name, role')
                .eq('id', sellerId)
                .single();
            sellerProfile = data;
            profileError = error;
        }
            
        if (profileError || !sellerProfile) {
            console.error('Error fetching seller profile:', profileError);
            throw new Error(`Seller profile not found for ID: ${sellerId}. Please ensure the broker exists in the system.`);
        }
            
        if (!sellerProfile) {
            console.error('No seller profile found for ID:', sellerId);
            throw new Error(`Seller profile not found for ID: ${sellerId}. Please ensure the broker exists in the system.`);
        }
        
        console.log('Found seller profile:', { 
            name: sellerProfile.full_name, 
            role: sellerProfile.role, 
            hasUpline: !!(sellerProfile as any).uplineId 
        });
        
        const commissions = [];
        let currentUplineId = (sellerProfile as any).uplineId || null;
        let level = 1;
        
        // If no upline system is set up, just process direct commission for the seller
        if (!currentUplineId) {
            console.log('No upline structure found, processing only direct commission for seller.');
        }
        
        // Commission percentages for each level
        const commissionRates = {
            direct: 6,    // Direct seller: 6%
            1: 2,         // Level 1 upline (immediate referrer): 2%
            2: 0.5,       // Level 2 upline (referrer of Level 1): 0.5%
            // Level 3 and above: 0% (no commission)
        };
        
        // Calculate seller's direct sale commission
        // Use plotData.commissionRate if provided, otherwise use default 6%
        const plotCommissionRate = plotData?.commissionRate || commissionRates.direct;
        const sellerDirectCommission = (saleAmount * plotCommissionRate) / 100;
        
        console.log(`💰 Calculating seller commission: ${saleAmount} × ${plotCommissionRate}% = ₹${sellerDirectCommission}`);
        
        // Use RPC function to update or create seller's wallet with full plot details
        const { error: sellerWalletError } = await supabaseAdmin.rpc('upsert_seller_commission', {
            seller_id: sellerId,
            seller_name: sellerProfile.full_name || 'Unknown',
            commission_amount: sellerDirectCommission,
            p_plot_number: plotData?.plotNumber?.toString() || null,
            p_project_name: plotData?.projectName || null
        });

        if (sellerWalletError) {
            console.error('Failed to update seller wallet via RPC:', sellerWalletError.message);
            console.log('Trying direct wallet update...');
            
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
            console.log(`✅ Updated wallet for seller: ${sellerId} - Added ₹${sellerDirectCommission}`);
        } else {
            console.log(`✅ Seller wallet updated via RPC - Added ₹${sellerDirectCommission}`);
        }

        // Create transaction record for seller's direct commission
        const { error: sellerTransactionError } = await supabaseAdmin
            .from('transactions')
            .insert({
                wallet_id: sellerId,
                wallet_type: 'direct',
                type: 'credit',
                amount: sellerDirectCommission,
                description: `Direct commission from plot sale (${plotCommissionRate}%)`,
                status: 'completed',
                plot_id: plotData?.id || null,
                project_name: plotData?.projectName || null,
            });
            
        if (sellerTransactionError) {
            console.error('Transaction creation failed:', sellerTransactionError.message);
            // Don't throw error, just log it
        } else {
            console.log(`✅ Transaction record created for seller`);
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
            
            const percentage = commissionRates[level as keyof typeof commissionRates];
            const commissionAmount = (saleAmount * percentage) / 100;
            
            console.log(`💰 Level ${level} upline commission: ${saleAmount} × ${percentage}% = ₹${commissionAmount} for ${uplineProfile.full_name}`);
            
            // Create commission record
            const commissionData = {
                sale_id: plotData?.id || `sale_${Date.now()}`,
                seller_id: sellerId,
                seller_name: sellerProfile.full_name || 'Unknown',
                receiver_id: uplineProfile.id,
                receiver_name: uplineProfile.full_name || 'Unknown',
                level: level,
                amount: commissionAmount,
                percentage: percentage,
                sale_amount: saleAmount,
                plot_id: plotData?.id || null,
                project_name: plotData?.projectName || null,
            };
            
            const { error: commissionError } = await supabaseAdmin
                .from('commissions')
                .insert(commissionData);
                
            if (commissionError) {
                console.error(`Failed to create commission record for level ${level}:`, commissionError.message);
                // Don't throw, just log
            } else {
                console.log(`✅ Commission record created for level ${level}`);
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
                console.error('Failed to update upline wallet via RPC:', uplineWalletError.message);
                console.log('Trying direct wallet update...');
                
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
                    console.error(`Failed to update upline wallet: ${upsertError.message}`);
                    // Don't throw, continue with next level
                } else {
                    console.log(`✅ Upline wallet updated - Added ₹${commissionAmount} to downline balance`);
                }
            } else {
                console.log(`✅ Upline wallet updated via RPC - Added ₹${commissionAmount}`);
            }
            
            // Create transaction record for the commission
            const { error: uplineTransactionError } = await supabaseAdmin
                .from('transactions')
                .insert({
                    wallet_id: uplineProfile.id,
                    wallet_type: 'downline',
                    type: 'credit',
                    amount: commissionAmount,
                    description: `Level ${level} commission from ${sellerProfile.full_name}'s sale`,
                    status: 'completed',
                    plot_id: plotData?.id || null,
                    project_name: plotData?.projectName || null,
                });
                
            if (uplineTransactionError) {
                console.error('Upline transaction creation failed:', uplineTransactionError.message);
                // Don't throw, just log
            } else {
                console.log(`✅ Transaction record created for upline level ${level}`);
            }
            
            commissions.push(commissionData);
            
            // Move to next level
            currentUplineId = (uplineProfile as any).uplineId;
            level++;
        }
        
        const totalDistributed = sellerDirectCommission + commissions.reduce((sum, c) => sum + c.amount, 0);
        
        console.log('\n🎉 Commission Distribution Summary:');
        console.log(`   Seller Direct Commission: ₹${sellerDirectCommission} (${plotCommissionRate}%)`);
        console.log(`   Upline Commissions (${commissions.length} levels): ₹${commissions.reduce((sum, c) => sum + c.amount, 0)}`);
        console.log(`   Total Distributed: ₹${totalDistributed}`);
        console.log(`   Sale Amount: ₹${saleAmount}`);
        console.log(`   Company Profit: ₹${saleAmount - totalDistributed}`);
        
        return {
            success: true,
            commissionsGenerated: commissions.length,
            totalDistributed: totalDistributed,
            sellerCommission: sellerDirectCommission,
            uplineCommissions: commissions.reduce((sum, c) => sum + c.amount, 0)
        };
        
    } catch (error) {
        console.error('❌ Error processing commission calculation:', error);
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
    const supabaseAdmin = await getSupabaseAdminClient();
    
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
        console.error('Error fetching commissions:', error);
        // Return empty array instead of throwing error to prevent UI crashes
        return [];
    }
}

// ========================================
// MANUAL COMMISSION CALCULATION
// ========================================

export async function calculateCommissionForSoldPlots() {
    try {
        await authorizeAdmin();
        const supabaseAdmin = await getSupabaseAdminClient();
        
        console.log('🔍 Starting commission recalculation for sold plots...');
        console.log('⚠️ This will clear all existing commissions and recalculate from scratch');
        
        // STEP 1: Clear all existing commissions and reset wallets
        console.log('🗑️ Clearing existing commissions and resetting wallets...');
        
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
        
        console.log('✅ Cleared existing data, starting fresh calculation...');
        
        // STEP 2: Get all sold plots with broker information
        const { data: soldPlots, error: plotError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .eq('status', 'sold');

        if (plotError) {
            throw new Error(`Failed to fetch sold plots: ${plotError.message}`);
        }

        if (!soldPlots || soldPlots.length === 0) {
            console.log('❌ No sold plots found');
            return { success: false, message: 'No sold plots found' };
        }

        // Filter plots that have broker information (either broker_id or updated_by)
        const plotsWithBroker = soldPlots.filter(plot => plot.broker_id || plot.updated_by);
        
        console.log(`📊 Found ${soldPlots.length} sold plots, ${plotsWithBroker.length} have broker information`);
        let processedCount = 0;
        let totalCommissionDistributed = 0;

        // STEP 3: Recalculate commissions for each plot
        for (const plot of plotsWithBroker) {
            try {
                // Use broker_id for booked plots, fall back to updated_by for old sold plots
                const brokerId = plot.broker_id || plot.updated_by;
                // Use total_plot_amount for booked plots, fall back to sale_price for old sold plots
                const saleAmount = plot.total_plot_amount || plot.sale_price;
                
                console.log(`\n🔄 Processing plot ${plot.plot_number} (${plot.project_name})`);
                console.log(`   Sale Amount: ₹${saleAmount}`);
                console.log(`   Broker ID: ${brokerId}`);
                
                // Use default commission rate of 6% to match the direct seller rate
                const defaultCommissionRate = plot.commission_rate || 6;
                console.log(`   Commission Rate: ${defaultCommissionRate}%`);

                // Calculate commission using our existing function
                const result = await processCommissionCalculation(
                    brokerId,
                    saleAmount,
                    {
                        id: plot.id,
                        projectName: plot.project_name,
                        plotNumber: plot.plot_number,
                        commissionRate: defaultCommissionRate
                    }
                );

                console.log(`   ✅ Commission calculated for plot ${plot.plot_number}`);
                processedCount++;
                totalCommissionDistributed += (saleAmount * defaultCommissionRate) / 100;

            } catch (plotError) {
                console.error(`❌ Error processing plot ${plot.plot_number}:`, plotError);
                // Continue with other plots even if one fails
            }
        }

        console.log(`\n🎉 Commission calculation complete!`);
        console.log(`   Plots processed: ${processedCount}/${plotsWithBroker.length}`);
        console.log(`   Total commission distributed: ₹${totalCommissionDistributed.toFixed(2)}`);

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
        console.error('❌ Error in calculateCommissionForSoldPlots:', error);
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
        const supabaseAdmin = await getSupabaseAdminClient();
        
        console.log(`🔄 Recalculating commission for plot: ${plotId}`);
        
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

        // Use total_plot_amount for booked plots, sale_price for old sold plots
        const saleAmount = plot.total_plot_amount || plot.sale_price;
        
        if (!saleAmount) {
            throw new Error('No sale amount found for this plot');
        }

        console.log(`📊 Plot Details:`);
        console.log(`   Project: ${plot.project_name}`);
        console.log(`   Plot #: ${plot.plot_number}`);
        console.log(`   Sale Amount: ₹${saleAmount}`);
        console.log(`   Broker ID: ${brokerId}`);
        console.log(`   Commission Rate: ${plot.commission_rate || 6}%`);

        // Calculate commission
        const result = await processCommissionCalculation(
            brokerId,
            saleAmount,
            {
                id: plot.id,
                projectName: plot.project_name,
                plotNumber: plot.plot_number,
                commissionRate: plot.commission_rate || 6, // Default to 6% if not set
            }
        );

        console.log(`✅ Commission recalculation complete`);

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
        console.error('❌ Error recalculating commission:', error);
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
        const supabaseAdmin = await getSupabaseAdminClient();
        

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
        console.error('Error in getPublicPlots:', error);
        throw new Error(`Failed to get plots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Get all plots function for inventory pages
export async function getPlots() {
    try {
        const supabaseAdmin = await getSupabaseAdminClient();
        
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
        console.error('Error in getPlots:', error);
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
        const supabaseAdmin = await getSupabaseAdminClient();
        
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
            console.error('Error fetching booked plots:', error);
            throw new Error(`Failed to fetch booked plots: ${error.message}`);
        }

        console.log('📊 Fetched booked plots:', plots?.length || 0);
        if (plots && plots.length > 0) {
            console.log('📊 First plot data:', {
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
        console.error('Error in getBookedPlots:', error);
        throw new Error(`Failed to get booked plots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get payment history for a specific plot
 */
export async function getPaymentHistory(plotId: string) {
    try {
        await authorizeAdmin();
        const supabaseAdmin = await getSupabaseAdminClient();
        
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
        console.error('Error in getPaymentHistory:', error);
        throw new Error(`Failed to get payment history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Ensure payment_history has an initial row for the booking amount.
 * This is a safety net for plots created before we started inserting the initial entry.
 */
async function ensureInitialBookingPayment(plotId: string) {
    try {
        const supabaseAdmin = await getSupabaseAdminClient();
        const { user } = await getAuthenticatedUser();

        // 1) Load plot minimal info
        const { data: plot, error: plotErr } = await supabaseAdmin
            .from('plots')
            .select('id, buyer_name, broker_id, booking_amount, created_at')
            .eq('id', plotId)
            .single();

        if (plotErr) {
            console.error('ensureInitialBookingPayment: failed to load plot', plotErr);
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
            console.error('ensureInitialBookingPayment: failed to check existing payment', existErr);
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
            console.error('ensureInitialBookingPayment: failed to insert initial booking payment', insertErr);
        } else {
            console.log('ensureInitialBookingPayment: inserted missing initial booking payment');
        }
    } catch (e) {
        console.error('ensureInitialBookingPayment: unexpected error', e);
    }
}

/**
 * Add a new payment to a booked plot
 * Automatically updates paid_percentage and triggers status change to 'Sold' if >= 75%
 */
export async function addPaymentToPlot(values: z.infer<typeof import('./schema').addPaymentSchema>) {
    try {
        const { user } = await getAuthenticatedUser('admin');
        const supabaseAdmin = await getSupabaseAdminClient();
        
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
        // 2. Change status to 'Sold' if paid_percentage >= 75%

        // Wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));


        // Check updated plot status and paid percentage
        const { data: updatedPlot, error: checkError } = await supabaseAdmin
            .from('plots')
            .select('status, paid_percentage, commission_status, broker_id, total_plot_amount, plot_number, project_name')
            .eq('id', values.plotId)
            .single();

        if (checkError) {
            console.error('❌ Error checking plot status:', checkError);
        } else {
            console.log('📊 Plot status after payment:', {
                plotId: values.plotId,
                status: updatedPlot?.status,
                paidPercentage: updatedPlot?.paid_percentage,
                commissionStatus: updatedPlot?.commission_status,
                brokerId: updatedPlot?.broker_id,
            });

            // Automatically trigger commission distribution at 75%+ payment if not already paid
            if (
                Number(updatedPlot?.paid_percentage) >= 75 &&
                updatedPlot?.commission_status === 'pending'
            ) {
                console.log('🎯 Payment reached 75%! Triggering commission distribution...');
                await triggerCommissionDistribution(values.plotId);
            } else if (updatedPlot?.commission_status === 'paid') {
                console.log('✅ Commission already paid');
            } else {
                console.log(`📝 Plot still in ${updatedPlot?.status} status (${updatedPlot?.paid_percentage}% paid)`);
            }
        }

        revalidatePath('/admin/booked-plots');
        revalidatePath('/admin/inventory');
        revalidatePath('/admin/brokers');
        revalidatePath('/admin/associates');
        
        return payment;
    } catch (error) {
        console.error('Error in addPaymentToPlot:', error);
        throw new Error(`Failed to add payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Trigger commission distribution when plot becomes Sold
 * Uses existing MLM commission logic (6%, 2%, 0.5%)
 */
async function triggerCommissionDistribution(plotId: string) {
    try {
        const supabaseAdmin = await getSupabaseAdminClient();
        
        // Get plot details with broker information
        const { data: plot, error: plotError } = await supabaseAdmin
            .from('plots')
            .select('*')
            .eq('id', plotId)
            .single();

        if (plotError || !plot) {
            console.error('❌ Plot not found:', plotError);
            throw new Error('Plot not found');
        }

        const soldAmount = plot.total_plot_amount;
        const brokerId = plot.broker_id;

        if (!soldAmount || !brokerId) {
            console.error('❌ Missing required data:', { soldAmount, brokerId });
            throw new Error('Missing required plot information for commission calculation');
        }

        console.log(`💰 Triggering commission distribution for plot ${plotId}:`, {
            project: plot.project_name,
            plotNumber: plot.plot_number,
            soldAmount,
            brokerId,
            status: plot.status,
            commissionStatus: plot.commission_status
        });

        // Use the existing commission calculation function
        const commissionRate = plot.commission_rate || 6; // Default to 6% if not set
        const result = await processCommissionCalculation(brokerId, soldAmount, {
            id: plot.id,
            projectName: plot.project_name,
            plotNumber: plot.plot_number,
            commissionRate: commissionRate
        });

        if (result.success) {
            // Mark commission as paid
            await supabaseAdmin
                .from('plots')
                .update({ commission_status: 'paid' })
                .eq('id', plotId);

            console.log(`✅ Commission distributed successfully for plot ${plot.plot_number}:`, {
                totalDistributed: result.totalDistributed,
                sellerCommission: result.sellerCommission,
                uplineCommissions: result.uplineCommissions
            });
        } else {
            console.error('❌ Commission calculation failed:', result.error);
            throw new Error(`Commission calculation failed: ${result.error}`);
        }

        // Revalidate broker pages to show updated balances
        revalidatePath('/admin/brokers');
        revalidatePath('/admin/associates');
        revalidatePath('/broker/wallets');
        revalidatePath('/broker/dashboard');

    } catch (error) {
        console.error('❌ Error in triggerCommissionDistribution:', error);
        // Don't throw - just log the error so the payment can still be recorded
        console.error(`Failed to distribute commission for plot ${plotId}, but payment was recorded`);
    }
}

// ============================================
// END BOOKED PLOTS MANAGEMENT
// ============================================

// Testimonial functions for testimonials pages
export async function getTestimonials() {
    try {
        const supabaseAdmin = await getSupabaseAdminClient();
        
        const { data: testimonials, error } = await supabaseAdmin
            .from('testimonials')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch testimonials: ${error.message}`);
        }

        return testimonials || [];
    } catch (error) {
        console.error('Error in getTestimonials:', error);
        throw new Error(`Failed to get testimonials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function createTestimonial(testimonialData: any) {
    try {
        await authorizeAdmin();
        const supabaseAdmin = await getSupabaseAdminClient();
        
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
        console.error('Error in createTestimonial:', error);
        throw new Error(`Failed to create testimonial: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function updateTestimonial(id: string, updates: any) {
    try {
        await authorizeAdmin();
        const supabaseAdmin = await getSupabaseAdminClient();
        
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
        console.error('Error in updateTestimonial:', error);
        throw new Error(`Failed to update testimonial: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function deleteTestimonial(id: string) {
    try {
        await authorizeAdmin();
        const supabaseAdmin = await getSupabaseAdminClient();
        
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
        console.error('Error in deleteTestimonial:', error);
        throw new Error(`Failed to delete testimonial: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function submitTestimonial(testimonialData: any) {
    try {
        const supabaseAdmin = await getSupabaseAdminClient();
        
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
        console.error('Error in submitTestimonial:', error);
        throw new Error(`Failed to submit testimonial: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function submitContactForm(formData: any) {
    try {
        const supabaseAdmin = await getSupabaseAdminClient();
        
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

        return contact;
    } catch (error) {
        console.error('Error in submitContactForm:', error);
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
        const supabaseAdmin = await getSupabaseAdminClient();
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
            console.log('Error fetching all broker profiles:', error);
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
        console.error('Error fetching dashboard analytics:', error);
        throw new Error('Failed to fetch dashboard analytics');
    }
}

export async function getBrokersList() {
    await authorizeAdmin();
    
    try {
        const supabaseAdmin = await getSupabaseAdminClient();
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
        console.error('Error fetching brokers list:', error);
        throw new Error('Failed to fetch brokers list');
    }
}

