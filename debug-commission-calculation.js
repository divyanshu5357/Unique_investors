/**
 * Debug script to check commission calculation details
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

async function debugCommissions() {
    console.log('🔍 Commission Calculation Debug\n');
    console.log('='.repeat(80));

    try {
        // 1. Check all sold plots
        console.log('\n📊 Step 1: All Sold Plots\n');
        const { data: soldPlots, error: plotsError } = await supabase
            .from('plots')
            .select('*')
            .eq('status', 'sold')
            .order('updated_at', { ascending: false });

        if (plotsError) {
            console.error('❌ Error:', plotsError.message);
            return;
        }

        console.log(`Found ${soldPlots?.length || 0} sold plots:\n`);
        for (const plot of soldPlots || []) {
            console.log(`Plot: ${plot.project_name} #${plot.plot_number}`);
            console.log(`   ID: ${plot.id}`);
            console.log(`   Broker ID: ${plot.broker_id}`);
            console.log(`   Total Amount: ₹${plot.total_plot_amount || plot.sale_price || 'N/A'}`);
            console.log(`   Commission Rate: ${plot.commission_rate || 'Not set'}%`);
            console.log(`   Commission Status: ${plot.commission_status}`);
            console.log(`   Paid %: ${plot.paid_percentage || 'N/A'}%`);
            console.log(`   Updated By: ${plot.updated_by}`);
            console.log('');
        }

        // 2. Check all brokers
        console.log('\n📊 Step 2: All Brokers\n');
        const { data: brokers } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'broker');

        for (const broker of brokers || []) {
            console.log(`Broker: ${broker.full_name} (${broker.email})`);
            console.log(`   ID: ${broker.id}`);

            // Get wallet
            const { data: wallet } = await supabase
                .from('wallets')
                .select('*')
                .eq('owner_id', broker.id)
                .single();

            if (wallet) {
                console.log(`   Direct Balance: ₹${wallet.direct_sale_balance || 0}`);
                console.log(`   Downline Balance: ₹${wallet.downline_sale_balance || 0}`);
                console.log(`   Total Balance: ₹${wallet.total_balance || 0}`);
            } else {
                console.log(`   No wallet found`);
            }
            console.log('');
        }

        // 3. Check transactions
        console.log('\n📊 Step 3: Recent Transactions\n');
        const { data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .eq('type', 'commission')
            .order('created_at', { ascending: false })
            .limit(10);

        console.log(`Found ${transactions?.length || 0} commission transactions:\n`);
        for (const tx of transactions || []) {
            console.log(`Transaction: ${tx.id}`);
            console.log(`   Wallet ID: ${tx.wallet_id}`);
            console.log(`   Amount: ₹${tx.amount}`);
            console.log(`   Description: ${tx.description}`);
            console.log(`   Reference (Plot) ID: ${tx.reference_id}`);
            console.log(`   Date: ${new Date(tx.created_at).toLocaleString()}`);
            console.log('');
        }

        // 4. Check commissions table
        console.log('\n📊 Step 4: Commission Records\n');
        const { data: commissions } = await supabase
            .from('commissions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        console.log(`Found ${commissions?.length || 0} commission records:\n`);
        for (const comm of commissions || []) {
            console.log(`Commission: ${comm.id}`);
            console.log(`   Receiver: ${comm.receiver_name} (${comm.receiver_id})`);
            console.log(`   Seller: ${comm.seller_name} (${comm.seller_id})`);
            console.log(`   Amount: ₹${comm.amount}`);
            console.log(`   Level: ${comm.level}`);
            console.log(`   Sale Amount: ₹${comm.sale_amount}`);
            console.log(`   Plot ID: ${comm.plot_id}`);
            console.log('');
        }

        // 5. Check payment history for plot #20
        console.log('\n📊 Step 5: Payment History for Plot #20\n');
        const { data: plot20 } = await supabase
            .from('plots')
            .select('id')
            .eq('plot_number', '20')
            .eq('project_name', 'Green Enclave')
            .single();

        if (plot20) {
            const { data: payments } = await supabase
                .from('payment_history')
                .select('*')
                .eq('plot_id', plot20.id)
                .order('payment_date', { ascending: true });

            console.log(`Found ${payments?.length || 0} payments:\n`);
            let totalPaid = 0;
            for (const payment of payments || []) {
                totalPaid += payment.amount_received;
                console.log(`Payment: ₹${payment.amount_received}`);
                console.log(`   Date: ${payment.payment_date}`);
                console.log(`   Notes: ${payment.notes || 'N/A'}`);
                console.log(`   Running Total: ₹${totalPaid}`);
                console.log('');
            }
        }

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugCommissions()
    .then(() => {
        console.log('\n✨ Debug complete!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Failed:', error);
        process.exit(1);
    });
