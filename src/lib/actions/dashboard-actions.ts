'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, authorizeAdmin, getSupabaseAdminClient } from '@/lib/serverUtils';
import { logger } from '@/lib/utils/logger';
import { GAJ_COMMISSION_RATES, calculateCommission } from '@/lib/commissionConfig';

// ========== DASHBOARD & ANALYTICS ==========

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
                area,
                status,
                buyer_name,
                broker_name,
                sale_date,
                total_plot_amount,
                booking_amount,
                paid_percentage,
                created_at,
                updated_at
            `)
            .eq('broker_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch plot history: ${error.message}`);
        }

        // For each plot, fetch payment history and enrich data
        const plotsWithPayments = await Promise.all(
            (plots || []).map(async (plot) => {
                const { data: payments } = await supabaseAdmin
                    .from('payment_history')
                    .select('amount_received, payment_date, buyer_name')
                    .eq('plot_id', plot.id)
                    .order('payment_date', { ascending: true });

                // For sold plots without buyer_name, try to get from payment_history
                let enrichedBuyerName = plot.buyer_name;
                let enrichedTotalAmount = plot.total_plot_amount;
                let enrichedPaidPercentage = plot.paid_percentage;

                if ((plot.status === 'sold' || plot.status === 'booked') && payments && payments.length > 0) {
                    // Enrich from payment history
                    if (!enrichedBuyerName && payments[0]?.buyer_name) {
                        enrichedBuyerName = payments[0].buyer_name;
                    }
                    
                    // Calculate total paid from payments
                    const totalPaid = payments.reduce((sum, p) => sum + (p.amount_received || 0), 0);
                    // If no total_plot_amount, use paid amount (for sold plots it might be the full sale amount)
                    if (!enrichedTotalAmount && totalPaid > 0) {
                        enrichedTotalAmount = totalPaid;
                    }
                    
                    // Recalculate paid percentage
                    if (enrichedTotalAmount && totalPaid > 0) {
                        enrichedPaidPercentage = (totalPaid / enrichedTotalAmount) * 100;
                    } else if (plot.status === 'sold' && !enrichedPaidPercentage) {
                        // Sold plots are considered 100% paid if no percentage is set
                        enrichedPaidPercentage = 100;
                    }
                }

                return {
                    id: plot.id,
                    plot_id: plot.id,
                    project_name: plot.project_name,
                    plot_number: plot.plot_number,
                    plot_size_gaj: plot.area || 0,
                    status: plot.status as 'available' | 'booked' | 'sold' | 'cancelled',
                    buyer_name: enrichedBuyerName,
                    broker_name: plot.broker_name,
                    booking_date: plot.created_at,
                    sale_date: plot.sale_date,
                    total_amount: enrichedTotalAmount,
                    booking_amount: plot.booking_amount,
                    paid_percentage: enrichedPaidPercentage || 0,
                    cancel_reason: null,
                    cancelled_date: null,
                    payment_history: (payments || []).map(p => ({
                        amount: p.amount_received,
                        date: p.payment_date
                    })),
                    created_at: plot.created_at,
                    updated_at: plot.updated_at,
                };
            })
        );

        return plotsWithPayments;
    } catch (error) {
        logger.error('Error fetching broker plot history:', error);
        throw new Error('Failed to fetch plot history');
    }
}
