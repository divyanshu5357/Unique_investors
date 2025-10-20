// Test script to check sold plots and calculate commissions
// This file can be run to see what sold plots exist and debug commission calculation

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSoldPlotsAndBrokers() {
    console.log('🔍 Checking database connection and table structure...\n');
    
    // Test database connection
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
        
        if (error) {
            console.error('❌ Database connection error:', error.message);
            return;
        }
        console.log('✅ Database connection successful');
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        return;
    }

    // Check what tables exist by trying different common names
    const tableTests = ['plots', 'plot', 'inventory', 'properties'];
    
    for (const tableName of tableTests) {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(5);
            
            if (!error && data) {
                console.log(`\n📊 Found table '${tableName}' with ${data.length} records (showing first 5):`);
                data.forEach((record, index) => {
                    console.log(`${index + 1}.`, JSON.stringify(record, null, 2));
                });
            } else if (error) {
                console.log(`❌ Table '${tableName}' error:`, error.message);
            }
        } catch (err) {
            console.log(`❌ Table '${tableName}' not accessible:`, err.message);
        }
    }

    // Get all brokers
    const { data: brokers, error: brokerError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('role', 'broker');
    
    if (brokerError) {
        console.error('❌ Error fetching brokers:', brokerError.message);
        return;
    }

    console.log(`\n👥 Found ${brokers?.length || 0} brokers:`);
    brokers?.forEach((broker, index) => {
        console.log(`${index + 1}. ${broker.full_name} (${broker.email}) - ID: ${broker.id}`);
    });

    // Get all wallets
    const { data: wallets, error: walletError } = await supabase
        .from('wallets')
        .select('*');
    
    if (walletError) {
        console.error('❌ Error fetching wallets:', walletError.message);
        return;
    }

    console.log(`\n💰 Found ${wallets?.length || 0} wallets:`);
    wallets?.forEach((wallet, index) => {
        console.log(`${index + 1}. Owner ID: ${wallet.owner_id}`);
        console.log(`   - Total Balance: ₹${wallet.total_balance || 0}`);
        console.log(`   - Direct Sale Balance: ₹${wallet.direct_sale_balance || 0}`);
        console.log(`   - Downline Sale Balance: ₹${wallet.downline_sale_balance || 0}`);
        console.log(`   - Owner Name: ${wallet.owner_name || 'Not set'}`);
    });

    // Get all commissions
    const { data: commissions, error: commissionError } = await supabase
        .from('commissions')
        .select('*');
    
    if (commissionError) {
        console.error('❌ Error fetching commissions:', commissionError.message);
        return;
    }

    console.log(`\n💸 Found ${commissions?.length || 0} commission records:`);
    commissions?.forEach((commission, index) => {
        console.log(`${index + 1}. Sale ID: ${commission.sale_id}`);
        console.log(`   - Receiver: ${commission.receiver_name} (${commission.receiver_id})`);
        console.log(`   - Amount: ₹${commission.amount}`);
        console.log(`   - Level: ${commission.level}`);
        console.log(`   - Percentage: ${commission.percentage}%`);
        console.log(`   - Created: ${commission.created_at}`);
    });

    // Get all transactions
    const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (transactionError) {
        console.error('❌ Error fetching transactions:', transactionError.message);
        return;
    }

    console.log(`\n💳 Found ${transactions?.length || 0} transactions:`);
    transactions?.slice(0, 10).forEach((transaction, index) => {
        console.log(`${index + 1}. Wallet ID: ${transaction.wallet_id}`);
        console.log(`   - Type: ${transaction.type} (${transaction.wallet_type})`);
        console.log(`   - Amount: ₹${transaction.amount}`);
        console.log(`   - Description: ${transaction.description}`);
        console.log(`   - Created: ${transaction.created_at}`);
    });

    console.log('\n✅ Analysis complete!');
}

// Run the check
checkSoldPlotsAndBrokers().catch(console.error);