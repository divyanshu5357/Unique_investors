// Script to create test plots in Supabase for commission calculation
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestPlots() {
    console.log('🏗️ Creating test plots for commission calculation...\n');
    
    // Get broker IDs
    const { data: brokers, error: brokerError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'broker');
    
    if (brokerError || !brokers || brokers.length === 0) {
        console.error('❌ No brokers found:', brokerError?.message);
        return;
    }

    console.log('👥 Available brokers:');
    brokers.forEach((broker, index) => {
        console.log(`${index + 1}. ${broker.full_name} (${broker.email}) - ID: ${broker.id}`);
    });

    // Create test plots based on what you described (using correct column names)
    const testPlots = [
        {
            plot_number: '2',
            project_name: 'Green Enclave',
            status: 'sold',
            price: 480000, // Original price
            sale_price: 500000, // ₹5,00,000 - actual sale price
            buyer_name: 'Test Buyer 1',
            buyer_phone: '9999999999',
            buyer_email: 'buyer1@example.com',
            area: 1000,
            facing: 'North',
            sale_date: new Date().toISOString().split('T')[0], // Today's date
            created_by: brokers[0].id, // Use created_by to track the selling broker
            updated_by: brokers[0].id
        },
        {
            plot_number: '3',
            project_name: 'Green Enclave',
            status: 'sold',
            price: 720000, // Original price
            sale_price: 750000, // ₹7,50,000 - actual sale price
            buyer_name: 'Test Buyer 2',
            buyer_phone: '8888888888',
            buyer_email: 'buyer2@example.com',
            area: 1200,
            facing: 'East',
            sale_date: new Date().toISOString().split('T')[0], // Today's date
            created_by: brokers[1].id, // Use created_by to track the selling broker
            updated_by: brokers[1].id
        }
    ];

    console.log('\n🏗️ Creating plots in Supabase...');
    
    for (const plot of testPlots) {
        try {
            const { data, error } = await supabase
                .from('plots')
                .insert(plot)
                .select()
                .single();
            
            if (error) {
                console.error(`❌ Error creating plot ${plot.plot_number}:`, error.message);
            } else {
                console.log(`✅ Created plot ${plot.plot_number} - ₹${plot.sale_price} sold by ${brokers.find(b => b.id === plot.created_by)?.full_name}`);
                
                // Calculate expected commission (assuming 2% default)
                const defaultCommissionRate = 2;
                const expectedCommission = (plot.sale_price * defaultCommissionRate) / 100;
                console.log(`   Expected commission (${defaultCommissionRate}%): ₹${expectedCommission.toLocaleString()}`);
            }
        } catch (err) {
            console.error(`❌ Error creating plot ${plot.plot_number}:`, err.message);
        }
    }

    console.log('\n🎉 Test plots created! Now you can:');
    console.log('1. Go to your admin dashboard');
    console.log('2. Click "Calculate Commissions for Sold Plots"');
    console.log('3. Check the broker wallets to see updated earnings');
    
    // Show total expected commissions (using 2% default rate)
    const defaultCommissionRate = 2;
    const totalExpectedCommission = testPlots.reduce((sum, plot) => {
        return sum + (plot.sale_price * defaultCommissionRate) / 100;
    }, 0);
    
    console.log(`\nTotal expected commission distribution (${defaultCommissionRate}%): ₹${totalExpectedCommission.toLocaleString()}`);
}

// Run the script
createTestPlots().catch(console.error);