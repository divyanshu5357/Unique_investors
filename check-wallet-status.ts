/**
 * Script to check wallet status for shubham kashyap after commission recalculation
 * Run this to verify if the database was actually updated
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkWalletStatus() {
    console.log('🔍 Checking wallet and transaction status...\n');

    // 1. Get shubham kashyap's profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'shubham@uniqueinvestor.in')
        .single();

    if (profileError || !profile) {
        console.log('❌ Could not find profile for shubham@uniqueinvestor.in');
        console.log('Searching by name...');
        
        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .ilike('full_name', '%shubham%kashyap%');
        
        if (profiles && profiles.length > 0) {
            console.log('Found profiles:', profiles);
        }
        return;
    }

    console.log('✅ Profile found:');
    console.log(`   ID: ${profile.id}`);
    console.log(`   Name: ${profile.full_name}`);
    console.log(`   Email: ${profile.email}`);
    console.log('');

    // 2. Check wallet
    const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('owner_id', profile.id)
        .single();

    if (walletError || !wallet) {
        console.log('❌ No wallet found!');
    } else {
        console.log('✅ Wallet status:');
        console.log(`   Direct Sale Balance: ₹${wallet.direct_sale_balance}`);
        console.log(`   Downline Sale Balance: ₹${wallet.downline_sale_balance}`);
        console.log(`   Total Balance: ₹${wallet.total_balance}`);
        console.log(`   Last Updated: ${wallet.updated_at}`);
        console.log('');
    }

    // 3. Check transactions
    const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', profile.id)
        .order('created_at', { ascending: false });

    if (transError) {
        console.log('❌ Error fetching transactions:', transError.message);
    } else {
        console.log(`✅ Found ${transactions?.length || 0} transactions:`);
        transactions?.forEach((tx, i) => {
            console.log(`\n   Transaction ${i + 1}:`);
            console.log(`   Type: ${tx.type}`);
            console.log(`   Amount: ₹${tx.amount}`);
            console.log(`   Description: ${tx.description}`);
            console.log(`   Status: ${tx.status}`);
            console.log(`   Created: ${tx.created_at}`);
        });
        console.log('');
    }

    // 4. Check sold plots
    const { data: soldPlots, error: plotsError } = await supabase
        .from('plots')
        .select('*')
        .eq('updated_by', profile.id)
        .eq('status', 'sold');

    if (plotsError) {
        console.log('❌ Error fetching sold plots:', plotsError.message);
    } else {
        console.log(`✅ Found ${soldPlots?.length || 0} sold plots:`);
        soldPlots?.forEach((plot, i) => {
            console.log(`\n   Plot ${i + 1}:`);
            console.log(`   Project: ${plot.project_name}`);
            console.log(`   Plot #: ${plot.plot_number}`);
            console.log(`   Sale Price: ₹${plot.sale_price}`);
            console.log(`   Commission Rate: ${plot.commission_rate}%`);
            console.log(`   Status: ${plot.status}`);
            console.log(`   Updated: ${plot.updated_at}`);
        });
    }
}

checkWalletStatus()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
