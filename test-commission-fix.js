/**
 * Test script to verify commission distribution fix for booked plots
 * Run this with: node test-commission-fix.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in environment variables');
    console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    console.log('URL Present:', !!supabaseUrl);
    console.log('Key Present:', !!supabaseServiceKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCommissionFix() {
    console.log('🔍 Testing Commission Distribution Fix\n');
    console.log('=' .repeat(80));

    try {
        // 1. Find booked plots with >= 75% payment
        console.log('\n📊 Step 1: Finding booked plots with >= 75% payment...\n');
        
        const { data: plots, error: plotsError } = await supabase
            .from('plots')
            .select('*')
            .eq('status', 'booked')
            .gte('paid_percentage', 75);

        if (plotsError) {
            console.error('❌ Error fetching plots:', plotsError.message);
            return;
        }

        if (!plots || plots.length === 0) {
            console.log('✅ No booked plots found with >= 75% payment (this is expected after fix)');
            console.log('\n📋 Checking for sold plots that were recently converted...\n');
            
            // Check for recently sold plots from booked status
            const { data: soldPlots, error: soldError } = await supabase
                .from('plots')
                .select('*')
                .eq('status', 'sold')
                .gte('paid_percentage', 75)
                .not('total_plot_amount', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(5);

            if (soldError) {
                console.error('❌ Error fetching sold plots:', soldError.message);
                return;
            }

            if (soldPlots && soldPlots.length > 0) {
                console.log(`✅ Found ${soldPlots.length} recently sold plots:\n`);
                for (const plot of soldPlots) {
                    console.log(`   Plot: ${plot.project_name} #${plot.plot_number}`);
                    console.log(`   - Status: ${plot.status}`);
                    console.log(`   - Paid: ${plot.paid_percentage}%`);
                    console.log(`   - Commission Status: ${plot.commission_status}`);
                    console.log(`   - Broker ID: ${plot.broker_id}`);
                    console.log(`   - Total Amount: ₹${plot.total_plot_amount}`);
                    console.log('');
                }
            }
        } else {
            console.log(`⚠️ Found ${plots.length} booked plots with >= 75% payment (should be converted to sold):\n`);
            for (const plot of plots) {
                console.log(`   Plot: ${plot.project_name} #${plot.plot_number}`);
                console.log(`   - Status: ${plot.status} (Should be: sold)`);
                console.log(`   - Paid: ${plot.paid_percentage}%`);
                console.log(`   - Commission Status: ${plot.commission_status}`);
                console.log('');
            }
        }

        // 2. Check for plots with status='sold' but commission='pending'
        console.log('\n📊 Step 2: Checking for sold plots with pending commissions...\n');
        
        const { data: pendingCommissions, error: pendingError } = await supabase
            .from('plots')
            .select('*')
            .eq('status', 'sold')
            .eq('commission_status', 'pending')
            .not('broker_id', 'is', null);

        if (pendingError) {
            console.error('❌ Error fetching pending commissions:', pendingError.message);
            return;
        }

        if (pendingCommissions && pendingCommissions.length > 0) {
            console.log(`⚠️ Found ${pendingCommissions.length} sold plots with pending commissions:\n`);
            for (const plot of pendingCommissions) {
                console.log(`   Plot: ${plot.project_name} #${plot.plot_number}`);
                console.log(`   - Broker ID: ${plot.broker_id}`);
                console.log(`   - Total Amount: ₹${plot.total_plot_amount || plot.sale_price || 'N/A'}`);
                console.log(`   - Status: ${plot.status}`);
                console.log(`   - Commission Status: ${plot.commission_status}`);
                console.log('');
            }
            
            console.log('💡 These plots need commission distribution. You can:');
            console.log('   1. Wait for the next payment to trigger it automatically');
            console.log('   2. Or manually trigger recalculation from Admin panel');
        } else {
            console.log('✅ No sold plots with pending commissions found');
        }

        // 3. Check broker wallets for recent transactions
        console.log('\n📊 Step 3: Checking recent wallet transactions...\n');
        
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('type', 'credit')
            .order('created_at', { ascending: false })
            .limit(10);

        if (txError) {
            console.error('❌ Error fetching transactions:', txError.message);
            return;
        }

        if (transactions && transactions.length > 0) {
            console.log(`✅ Found ${transactions.length} recent credit transactions:\n`);
            for (const tx of transactions) {
                console.log(`   Transaction ID: ${tx.id}`);
                console.log(`   - Wallet: ${tx.wallet_id}`);
                console.log(`   - Type: ${tx.wallet_type}`);
                console.log(`   - Amount: ₹${tx.amount}`);
                console.log(`   - Description: ${tx.description}`);
                console.log(`   - Date: ${new Date(tx.created_at).toLocaleString()}`);
                console.log('');
            }
        } else {
            console.log('⚠️ No recent credit transactions found');
        }

        // 4. Summary
        console.log('\n' + '='.repeat(80));
        console.log('📋 Summary:');
        console.log('='.repeat(80));
        console.log('');
        
        if ((!plots || plots.length === 0) && (!pendingCommissions || pendingCommissions.length === 0)) {
            console.log('✅ All systems working correctly!');
            console.log('   - No booked plots stuck at >= 75%');
            console.log('   - No sold plots with pending commissions');
        } else {
            console.log('⚠️ Issues detected:');
            if (plots && plots.length > 0) {
                console.log(`   - ${plots.length} booked plot(s) at >= 75% not converted to sold`);
            }
            if (pendingCommissions && pendingCommissions.length > 0) {
                console.log(`   - ${pendingCommissions.length} sold plot(s) with pending commissions`);
            }
            console.log('\n💡 Recommendations:');
            console.log('   1. Add a new payment to trigger the fix');
            console.log('   2. Or use the recalculate commission API endpoint');
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the test
console.log('\n🚀 Starting commission fix verification...\n');
testCommissionFix()
    .then(() => {
        console.log('\n✨ Test completed!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
