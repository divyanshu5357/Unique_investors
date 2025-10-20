/**
 * Direct Commission Distribution for Plot #20
 * This script calculates and distributes commission directly to the database
 * Run with: node distribute-commission-direct.js
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

async function distributeCommission() {
    console.log('💰 Direct Commission Distribution\n');
    console.log('=' .repeat(80));

    try {
        // Get the plot that needs commission
        const { data: plot, error: plotError } = await supabase
            .from('plots')
            .select('*')
            .eq('status', 'sold')
            .eq('commission_status', 'pending')
            .eq('plot_number', '20')
            .eq('project_name', 'Green Enclave')
            .single();

        if (plotError || !plot) {
            console.log('❌ Plot not found or already processed');
            return;
        }

        console.log('\n📊 Plot Details:');
        console.log(`   Project: ${plot.project_name}`);
        console.log(`   Plot #: ${plot.plot_number}`);
        console.log(`   Total Amount: ₹${plot.total_plot_amount}`);
        console.log(`   Broker ID: ${plot.broker_id}`);
        console.log(`   Paid: ${plot.paid_percentage}%`);

        // Get broker details
        const { data: broker, error: brokerError } = await supabase
            .from('profiles')
            .select('id, full_name, "uplineId"')
            .eq('id', plot.broker_id)
            .single();

        if (brokerError || !broker) {
            console.log('❌ Broker not found');
            return;
        }

        console.log(`\n👤 Broker: ${broker.full_name}`);

        // Commission rates
        const directRate = 6; // 6%
        const level1Rate = 2; // 2%
        const level2Rate = 0.5; // 0.5%

        const totalAmount = plot.total_plot_amount;
        const directCommission = totalAmount * (directRate / 100);
        const level1Commission = totalAmount * (level1Rate / 100);
        const level2Commission = totalAmount * (level2Rate / 100);

        console.log(`\n💸 Commission Breakdown:`);
        console.log(`   Direct (${directRate}%): ₹${directCommission.toLocaleString()}`);
        console.log(`   Level 1 (${level1Rate}%): ₹${level1Commission.toLocaleString()}`);
        console.log(`   Level 2 (${level2Rate}%): ₹${level2Commission.toLocaleString()}`);

        // 1. Update direct seller's wallet
        console.log(`\n🔄 Distributing commissions...`);
        console.log(`\n   1️⃣ Direct Seller Commission...`);

        const { data: sellerWallet, error: getWalletError } = await supabase
            .from('wallets')
            .select('*')
            .eq('owner_id', broker.id)
            .single();

        if (getWalletError) {
            console.log('   Creating new wallet...');
        }

        const newDirectBalance = (sellerWallet?.direct_sale_balance || 0) + directCommission;
        const newTotalBalance = (sellerWallet?.total_balance || 0) + directCommission;

        const { error: walletError } = await supabase
            .from('wallets')
            .upsert({
                owner_id: broker.id,
                direct_sale_balance: newDirectBalance,
                downline_sale_balance: sellerWallet?.downline_sale_balance || 0,
                total_balance: newTotalBalance,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'owner_id'
            });

        if (walletError) {
            console.log(`   ❌ Error updating wallet:`, walletError.message);
        } else {
            console.log(`   ✅ Added ₹${directCommission.toLocaleString()} to ${broker.full_name}'s wallet`);
        }

        // Create transaction record
        const { error: txError } = await supabase
            .from('transactions')
            .insert({
                wallet_id: broker.id,
                type: 'commission',
                amount: directCommission,
                description: `Direct commission from plot sale (${directRate}%)`,
                reference_id: plot.id,
                created_at: new Date().toISOString(),
                date: new Date().toISOString()
            });

        if (txError) {
            console.log(`   ⚠️ Transaction record failed:`, txError.message);
        } else {
            console.log(`   ✅ Transaction record created`);
        }

        // 2. Level 1 upline (if exists)
        if (broker.uplineId) {
            const { data: level1, error: level1Error } = await supabase
                .from('profiles')
                .select('id, full_name, "uplineId"')
                .eq('id', broker.uplineId)
                .single();

            if (level1 && !level1Error) {
                console.log(`\n   2️⃣ Level 1 Upline Commission (${level1.full_name})...`);

                const { data: level1Wallet } = await supabase
                    .from('wallets')
                    .select('*')
                    .eq('owner_id', level1.id)
                    .single();

                const newDownlineBalance = (level1Wallet?.downline_sale_balance || 0) + level1Commission;
                const newLevel1Total = (level1Wallet?.total_balance || 0) + level1Commission;

                const { error: level1WalletError } = await supabase
                    .from('wallets')
                    .upsert({
                        owner_id: level1.id,
                        direct_sale_balance: level1Wallet?.direct_sale_balance || 0,
                        downline_sale_balance: newDownlineBalance,
                        total_balance: newLevel1Total,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'owner_id'
                    });

                if (!level1WalletError) {
                    console.log(`   ✅ Added ₹${level1Commission.toLocaleString()} to ${level1.full_name}'s wallet`);

                    await supabase.from('transactions').insert({
                        wallet_id: level1.id,
                        type: 'commission',
                        amount: level1Commission,
                        description: `Level 1 commission from ${broker.full_name}'s sale`,
                        reference_id: plot.id,
                        created_at: new Date().toISOString(),
                        date: new Date().toISOString()
                    });
                    console.log(`   ✅ Transaction record created`);
                }

                // 3. Level 2 upline (if exists)
                if (level1.uplineId) {
                    const { data: level2 } = await supabase
                        .from('profiles')
                        .select('id, full_name')
                        .eq('id', level1.uplineId)
                        .single();

                    if (level2) {
                        console.log(`\n   3️⃣ Level 2 Upline Commission (${level2.full_name})...`);

                        const { data: level2Wallet } = await supabase
                            .from('wallets')
                            .select('*')
                            .eq('owner_id', level2.id)
                            .single();

                        const newLevel2Downline = (level2Wallet?.downline_sale_balance || 0) + level2Commission;
                        const newLevel2Total = (level2Wallet?.total_balance || 0) + level2Commission;

                        await supabase.from('wallets').upsert({
                            owner_id: level2.id,
                            direct_sale_balance: level2Wallet?.direct_sale_balance || 0,
                            downline_sale_balance: newLevel2Downline,
                            total_balance: newLevel2Total,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'owner_id' });

                        console.log(`   ✅ Added ₹${level2Commission.toLocaleString()} to ${level2.full_name}'s wallet`);

                        await supabase.from('transactions').insert({
                            wallet_id: level2.id,
                            type: 'commission',
                            amount: level2Commission,
                            description: `Level 2 commission from ${broker.full_name}'s sale`,
                            reference_id: plot.id,
                            created_at: new Date().toISOString(),
                            date: new Date().toISOString()
                        });
                        console.log(`   ✅ Transaction record created`);
                    }
                }
            }
        }

        // Mark commission as paid
        console.log(`\n🔄 Marking commission as paid...`);
        const { error: updateError } = await supabase
            .from('plots')
            .update({ 
                commission_status: 'paid',
                updated_at: new Date().toISOString()
            })
            .eq('id', plot.id);

        if (updateError) {
            console.log(`❌ Error updating plot:`, updateError.message);
        } else {
            console.log(`✅ Commission status updated to 'paid'`);
        }

        console.log(`\n${'='.repeat(80)}`);
        console.log(`\n✨ Commission Distribution Complete!`);
        console.log(`\n📊 Summary:`);
        console.log(`   Plot: ${plot.project_name} #${plot.plot_number}`);
        console.log(`   Total Distributed: ₹${(directCommission + level1Commission + level2Commission).toLocaleString()}`);
        console.log(`\n📋 Next Steps:`);
        console.log(`   1. Check Admin → Brokers to verify wallet balances`);
        console.log(`   2. Check Admin → Transactions to see commission records`);
        console.log(`   3. Verify plot status shows 'sold' with commission 'paid'\n`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the distribution
console.log('\n🚀 Starting direct commission distribution...\n');
distributeCommission()
    .then(() => {
        console.log('✨ Done!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Failed:', error);
        process.exit(1);
    });
