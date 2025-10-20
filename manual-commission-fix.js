/**
 * Manual Fix Script for Stuck Commissions
 * This script finds and fixes plots that are sold but have pending commissions
 * Run with: node manual-commission-fix.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    console.log('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    console.log('URL Present:', !!supabaseUrl);
    console.log('Key Present:', !!supabaseServiceKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function manualCommissionFix() {
    console.log('🔧 Manual Commission Fix Script\n');
    console.log('=' .repeat(80));

    try {
        // Find plots with sold status but pending commissions
        console.log('\n🔍 Finding plots that need commission distribution...\n');
        
        const { data: plots, error } = await supabase
            .from('plots')
            .select('*')
            .eq('status', 'sold')
            .eq('commission_status', 'pending')
            .not('broker_id', 'is', null);

        if (error) {
            console.error('❌ Error:', error.message);
            return;
        }

        if (!plots || plots.length === 0) {
            console.log('✅ No plots found that need fixing!');
            console.log('All sold plots have commissions distributed.\n');
            return;
        }

        console.log(`📊 Found ${plots.length} plot(s) that need commission distribution:\n`);

        for (const plot of plots) {
            console.log(`\n${'─'.repeat(80)}`);
            console.log(`Plot: ${plot.project_name} #${plot.plot_number}`);
            console.log(`   Broker ID: ${plot.broker_id}`);
            console.log(`   Amount: ₹${plot.total_plot_amount || plot.sale_price || 'N/A'}`);
            console.log(`   Status: ${plot.status}`);
            console.log(`   Commission Status: ${plot.commission_status}`);
            console.log(`   Paid %: ${plot.paid_percentage || 'N/A'}%`);

            // Call the recalculate commission API endpoint
            console.log(`\n   🔄 Triggering commission distribution...`);
            
            try {
                const response = await fetch(`${supabaseUrl.replace('supabase.co', 'supabase.co')}/api/recalculate-commission`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ plotId: plot.id })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    console.log(`   ✅ Commission distributed successfully!`);
                    console.log(`   📊 Result:`, result.data);
                } else {
                    console.log(`   ⚠️ Commission distribution may have had issues:`, result.message || result.error);
                    console.log(`   💡 You can manually trigger this from the admin panel`);
                }
            } catch (apiError) {
                console.log(`   ⚠️ Could not call API (app might not be running):`, apiError.message);
                console.log(`   💡 Start your Next.js app and try again, or use admin panel`);
            }
        }

        console.log(`\n${'='.repeat(80)}`);
        console.log(`\n✨ Fix process completed!`);
        console.log(`\n📋 Next Steps:`);
        console.log(`   1. Check the admin dashboard to verify commission distribution`);
        console.log(`   2. Verify broker wallet balances are updated`);
        console.log(`   3. Check transaction history for commission records\n`);

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Show usage instructions
console.log('\n📖 Manual Commission Fix Script');
console.log('This script will find and fix plots with pending commissions\n');

// Run the fix
manualCommissionFix()
    .then(() => {
        console.log('✨ Done!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
