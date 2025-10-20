import { createClient } from '@/lib/supabase/client';

// Quick script to check sold plot data and recalculate commissions
async function checkSoldPlots() {
    const supabase = createClient();
    
    console.log('🔍 Checking sold plots...\n');
    
    // Get sold plots
    const { data: plots, error } = await supabase
        .from('plots')
        .select('*')
        .eq('status', 'sold');
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`Found ${plots?.length || 0} sold plots:\n`);
    
    plots?.forEach((plot, index) => {
        console.log(`Plot ${index + 1}:`);
        console.log(`  Project: ${plot.project_name}`);
        console.log(`  Plot #: ${plot.plot_number}`);
        console.log(`  Status: ${plot.status}`);
        console.log(`  Sale Price: ₹${plot.sale_price || 0}`);
        console.log(`  Commission Rate: ${plot.commission_rate || 'NOT SET'}%`);
        console.log(`  Broker ID (updated_by): ${plot.updated_by || 'NOT SET'}`);
        console.log(`  Created By: ${plot.created_by}`);
        console.log(`  Buyer: ${plot.buyer_name || 'NOT SET'}`);
        console.log('');
    });
    
    // Check wallets
    console.log('💰 Checking wallets...\n');
    const { data: wallets } = await supabase
        .from('wallets')
        .select('*');
    
    wallets?.forEach(wallet => {
        console.log(`Wallet for: ${wallet.owner_name || wallet.owner_id}`);
        console.log(`  Direct: ₹${wallet.direct_sale_balance || 0}`);
        console.log(`  Downline: ₹${wallet.downline_sale_balance || 0}`);
        console.log(`  Total: ₹${wallet.total_balance || 0}`);
        console.log('');
    });
    
    // Check transactions
    console.log('📋 Checking transactions...\n');
    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
    
    console.log(`Found ${transactions?.length || 0} transactions`);
    transactions?.forEach(tx => {
        console.log(`  ${tx.type}: ₹${tx.amount} - ${tx.description}`);
    });
}

checkSoldPlots();
