'use server';

import z from 'zod';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, authorizeAdmin, getSupabaseAdminClient } from '@/lib/serverUtils';
import { logger } from '@/lib/utils/logger';
import { processCommissionCalculation } from './commission-actions';
import { addPaymentSchema } from '@/lib/schema';

// ========== BOOKED PLOTS MANAGEMENT ==========

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
        
        // First, get the plot to check if it's sold and has sold_amount
        const { data: plot, error: plotError } = await supabaseAdmin
            .from('plots')
            .select('id, status, sold_amount, updated_at, buyer_name')
            .eq('id', plotId)
            .single();
        
        if (plotError) {
            throw new Error(`Failed to fetch plot: ${plotError.message}`);
        }
        
        // Query payment_history table for actual payment records
        // From migration 20241020000002 - has amount_received, payment_date columns
        const { data: payments, error } = await supabaseAdmin
            .from('payment_history')
            .select(`
                id,
                amount_received,
                payment_date,
                notes,
                buyer_name
            `)
            .eq('plot_id', plotId)
            .order('payment_date', { ascending: true, nullsFirst: false });

        if (error) {
            throw new Error(`Failed to fetch payment history: ${error.message}`);
        }

        // Transform to match expected format for the History tab
        const transformedPayments = (payments || []).map((p: any) => ({
            id: p.id,
            payment_date: p.payment_date,
            amount_received: p.amount_received,
            notes: p.notes,
            buyer_name: p.buyer_name
        }));
        
        // For SOLD plots with NO payment history, create a synthetic entry based on sold_amount
        if (plot.status === 'sold' && transformedPayments.length === 0 && plot.sold_amount && plot.sold_amount > 0) {
            const syntheticPayment = {
                id: `synthetic-${plotId}`,
                payment_date: plot.updated_at || new Date().toISOString(),
                amount_received: plot.sold_amount,
                notes: 'Sale amount (plot marked as sold)',
                buyer_name: plot.buyer_name
            };
            transformedPayments.push(syntheticPayment);
        }
        
        return transformedPayments;
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
export async function addPaymentToPlot(values: z.infer<typeof addPaymentSchema>) {
    try {
        const { user } = await getAuthenticatedUser('admin');
        const supabaseAdmin = getSupabaseAdminClient();
        
        // Get plot details
        const { data: plot, error: plotError } = await supabaseAdmin
            .from('plots')
            .select('id, buyer_name, broker_id, total_plot_amount, status, remaining_amount')
            .eq('id', values.plotId)
            .single();

        if (plotError || !plot) {
            throw new Error('Plot not found');
        }

        if (plot.status.toLowerCase() !== 'booked') {
            throw new Error('Can only add payments to booked plots');
        }

        // Validate amount doesn't exceed remaining balance
        if (values.amountReceived > plot.remaining_amount) {
            throw new Error(`Payment amount cannot exceed remaining balance of ₹${plot.remaining_amount.toLocaleString('en-IN')}`);
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
                payment_method: values.paymentMethod,
                transaction_id: values.transactionId,
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

/**
 * Cancel a booked plot and reset it to available status
 */
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
