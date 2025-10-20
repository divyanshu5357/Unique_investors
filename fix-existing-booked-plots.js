/**
 * Fix script for existing booked plots that are stuck at >= 75%
 * This manually updates their status to 'sold' and triggers commission distribution
 * Run with: node fix-existing-booked-plots.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixExistingBookedPlots() {
    console.log('🔧 Fixing Existing Booked Plots at >= 75% Payment\n');
    console.log('=' .repeat(80));

    try {
        // Find all booked plots with >= 75% payment
        console.log('\n🔍 Finding booked plots at >= 75% payment...\n');
        
        const { data: plots, error: plotsError } = await supabase
            .from('plots')
            .select('*')
            .eq('status', 'booked')
            .gte('paid_percentage', 75)
            .not('broker_id', 'is', null)
            .not('total_plot_amount', 'is', null);

        if (plotsError) {
            console.error('❌ Error:', plotsError.message);
            return;
        }

        if (!plots || plots.length === 0) {
            console.log('✅ No plots need fixing! All booked plots are under 75%.\n');
            return;
        }

        console.log(`📊 Found ${plots.length} plot(s) to fix:\n`);

        for (const plot of plots) {
            console.log(`\n${'─'.repeat(80)}`);
            console.log(`Plot: ${plot.project_name} #${plot.plot_number}`);
            console.log(`   Current Status: ${plot.status}`);
            console.log(`   Paid Percentage: ${plot.paid_percentage}%`);
            console.log(`   Total Amount: ₹${plot.total_plot_amount}`);
            console.log(`   Broker ID: ${plot.broker_id}`);
            console.log(`   Commission Status: ${plot.commission_status}`);

            // Step 1: Update status to 'sold'
            console.log(`\n   🔄 Step 1: Updating status to 'sold'...`);
            const { error: updateError } = await supabase
                .from('plots')
                .update({ 
                    status: 'sold',
                    updated_at: new Date().toISOString()
                })
                .eq('id', plot.id);

            if (updateError) {
                console.log(`   ❌ Failed to update status:`, updateError.message);
                continue;
            }
            console.log(`   ✅ Status updated to 'sold'`);

            // Step 2: Trigger commission distribution if not already paid
            if (plot.commission_status === 'pending') {
                console.log(`\n   🔄 Step 2: Triggering commission distribution...`);
                
                // We'll call the API endpoint or directly calculate commission
                // For now, let's use a fetch to the API if the server is running
                try {
                    const response = await fetch(`http://localhost:9003/api/recalculate-commission`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ plotId: plot.id })
                    });

                    if (response.ok) {
                        const result = await response.json();
                        console.log(`   ✅ Commission distributed successfully!`);
                        console.log(`   📊 Result:`, result.message);
                    } else {
                        console.log(`   ⚠️ API call failed. Server may not be running.`);
                        console.log(`   💡 Start your Next.js server and run this script again`);
                        console.log(`   💡 Or manually add a small payment (₹1) to trigger commission`);
                    }
                } catch (apiError) {
                    console.log(`   ⚠️ Could not reach API (server not running)`);
                    console.log(`   💡 Option 1: Start server with 'npm run dev' and re-run this script`);
                    console.log(`   💡 Option 2: Go to Admin → Booked Plots and add ₹1 payment`);
                }
            } else {
                console.log(`\n   ✅ Commission already distributed`);
            }
        }

        console.log(`\n${'='.repeat(80)}`);
        console.log(`\n✨ Fix process completed!`);
        console.log(`\n📋 Summary:`);
        console.log(`   - ${plots.length} plot(s) updated to 'sold' status`);
        console.log(`\n📖 Next Steps:`);
        console.log(`   1. Check Admin → Inventory to verify plot status is 'sold'`);
        console.log(`   2. Check Admin → Brokers to verify commission in wallets`);
        console.log(`   3. If commission not distributed, add a ₹1 payment to trigger it\n`);

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the fix
console.log('\n🚀 Starting fix for existing booked plots...\n');
fixExistingBookedPlots()
    .then(() => {
        console.log('✨ Done!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Fix failed:', error);
        process.exit(1);
    });
