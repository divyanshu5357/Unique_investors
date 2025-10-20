/**
 * Recalculate ALL commissions using the corrected logic
 * This will:
 * 1. Clear all existing commissions and transactions
 * 2. Reset all wallet balances
 * 3. Recalculate using broker_id (not updated_by)
 * 4. Use total_plot_amount for booked plots (not just sale_price)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function recalculateAllCommissions() {
    console.log('🔄 Recalculating ALL Commissions with Fixed Logic\n');
    console.log('='.repeat(80));

    try {
        // Call the API endpoint to recalculate
        console.log('\n📞 Calling recalculation API...\n');
        
        const apiUrl = `http://localhost:9003/api/recalculate-commission`;
        
        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();

            if (response.ok) {
                console.log('✅ API call successful!\n');
                console.log('📊 Result:', result);
                
                if (result.success) {
                    console.log('\n🎉 Commission recalculation completed!');
                    console.log(`   Plots processed: ${result.plotsProcessed || 'N/A'}`);
                    console.log(`   Total distributed: ₹${result.totalCommission?.toFixed(2) || 'N/A'}`);
                }
            } else {
                console.log('❌ API call failed:', result.error || result.message);
            }
        } catch (apiError) {
            console.log('⚠️ Could not reach API (server might not be running)');
            console.log('Error:', apiError.message);
            console.log('\n💡 Please start your Next.js server first:');
            console.log('   npm run dev');
            console.log('\nThen run this script again.');
            return;
        }

        // Verify the results
        console.log('\n📊 Verifying Results...\n');
        
        // Check wallets
        const { data: wallets } = await supabase
            .from('wallets')
            .select('owner_id, direct_sale_balance, downline_sale_balance, total_balance')
            .gt('total_balance', 0);

        console.log(`✅ Found ${wallets?.length || 0} brokers with commission:\n`);
        for (const wallet of wallets || []) {
            const { data: broker } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', wallet.owner_id)
                .single();

            console.log(`${broker?.full_name || 'Unknown'}: ₹${wallet.total_balance}`);
            console.log(`   Direct: ₹${wallet.direct_sale_balance}`);
            console.log(`   Downline: ₹${wallet.downline_sale_balance}`);
            console.log('');
        }

        // Check plots
        const { data: plots } = await supabase
            .from('plots')
            .select('plot_number, project_name, commission_status, broker_id, total_plot_amount')
            .eq('status', 'sold');

        console.log(`📊 Sold Plots Status:\n`);
        for (const plot of plots || []) {
            const { data: broker } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', plot.broker_id)
                .single();

            console.log(`Plot #${plot.plot_number} (${plot.project_name})`);
            console.log(`   Broker: ${broker?.full_name || 'Unknown'}`);
            console.log(`   Amount: ₹${plot.total_plot_amount || 'N/A'}`);
            console.log(`   Commission Status: ${plot.commission_status}`);
            console.log('');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('\n🚀 Starting commission recalculation...\n');
console.log('⚠️  Make sure your Next.js server is running (npm run dev)\n');

recalculateAllCommissions()
    .then(() => {
        console.log('\n✨ Done!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Failed:', error);
        process.exit(1);
    });
