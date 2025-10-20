/**
 * Direct Commission Fix Script
 * 
 * This script bypasses the API and directly:
 * 1. Clears existing wrong commissions
 * 2. Resets wallet balances
 * 3. Recalculates correct commissions using broker_id
 * 4. Distributes to correct brokers
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Commission rates from system
const DIRECT_COMMISSION_RATE = 6;
const LEVEL1_COMMISSION_RATE = 2;
const LEVEL2_COMMISSION_RATE = 0.5;

async function fixCommissions() {
  console.log('🔧 Starting Direct Commission Fix\n');
  console.log('This will:');
  console.log('1. Clear all existing commissions');
  console.log('2. Reset wallet balances to 0');
  console.log('3. Recalculate using CORRECT logic (broker_id)');
  console.log('4. Distribute to CORRECT brokers\n');
  console.log('=' .repeat(80));

  try {
    // Step 1: Get all sold plots with broker information
    console.log('\n📊 Step 1: Fetching sold plots...');
    const { data: soldPlots, error: plotsError } = await supabase
      .from('plots')
      .select(`
        id,
        plot_number,
        project_name,
        status,
        sale_price,
        total_plot_amount,
        broker_id,
        updated_by,
        commission_status,
        profiles!plots_broker_id_fkey (
          id,
          name,
          sponsorid
        )
      `)
      .eq('status', 'sold');

    if (plotsError) throw plotsError;

    console.log(`✅ Found ${soldPlots.length} sold plots`);
    
    // Filter plots that have broker info
    const plotsWithBroker = soldPlots.filter(plot => {
      const brokerId = plot.broker_id || plot.updated_by;
      return brokerId !== null;
    });

    console.log(`✅ ${plotsWithBroker.length} plots have broker information\n`);

    // Step 2: Clear existing commissions
    console.log('🗑️  Step 2: Clearing existing wrong commissions...');
    
    // Delete from commissions table
    const { error: deleteCommError } = await supabase
      .from('commissions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteCommError) throw deleteCommError;
    console.log('✅ Cleared commissions table');

    // Reset all wallet balances to 0
    const { error: resetWalletError } = await supabase
      .from('wallets')
      .update({ 
        total_balance: 0,
        direct_sale_balance: 0,
        downline_sale_balance: 0
      })
      .neq('owner_id', '00000000-0000-0000-0000-000000000000');

    if (resetWalletError) throw resetWalletError;
    console.log('✅ Reset all wallet balances to 0\n');

    // Step 3: Recalculate commissions for each plot
    console.log('💰 Step 3: Recalculating commissions with FIXED logic...\n');

    for (const plot of plotsWithBroker) {
      const brokerId = plot.broker_id || plot.updated_by;
      const saleAmount = plot.total_plot_amount || plot.sale_price;

      console.log(`\nProcessing Plot #${plot.plot_number} (${plot.project_name})`);
      console.log(`  Amount: ₹${saleAmount?.toLocaleString('en-IN')}`);
      
      // Get broker details with upline chain
      const { data: broker, error: brokerError } = await supabase
        .from('profiles')
        .select('id, name, sponsorid')
        .eq('id', brokerId)
        .single();

      if (brokerError || !broker) {
        console.log(`  ⚠️  Broker not found, skipping...`);
        continue;
      }

      console.log(`  Broker: ${broker.name} (${brokerId})`);

      // Calculate direct commission
      const directAmount = (saleAmount * DIRECT_COMMISSION_RATE) / 100;
      console.log(`  Direct Commission (6%): ₹${directAmount.toLocaleString('en-IN')}`);

      // Add direct commission
      await addCommission(
        broker.id,
        broker.name,
        plot.id,
        directAmount,
        'direct',
        DIRECT_COMMISSION_RATE
      );

      // Level 1 commission (sponsor)
      if (broker.sponsorid) {
        const { data: level1, error: level1Error } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('id', broker.sponsorid)
          .single();

        if (!level1Error && level1) {
          const level1Amount = (saleAmount * LEVEL1_COMMISSION_RATE) / 100;
          console.log(`  Level 1 Commission (2%): ₹${level1Amount.toLocaleString('en-IN')} to ${level1.name}`);
          
          await addCommission(
            level1.id,
            level1.name,
            plot.id,
            level1Amount,
            'level_1',
            LEVEL1_COMMISSION_RATE
          );

          // Level 2 commission (sponsor's sponsor)
          const { data: level1Profile } = await supabase
            .from('profiles')
            .select('sponsorid')
            .eq('id', level1.id)
            .single();

          if (level1Profile?.sponsorid) {
            const { data: level2, error: level2Error } = await supabase
              .from('profiles')
              .select('id, name')
              .eq('id', level1Profile.sponsorid)
              .single();

            if (!level2Error && level2) {
              const level2Amount = (saleAmount * LEVEL2_COMMISSION_RATE) / 100;
              console.log(`  Level 2 Commission (0.5%): ₹${level2Amount.toLocaleString('en-IN')} to ${level2.name}`);
              
              await addCommission(
                level2.id,
                level2.name,
                plot.id,
                level2Amount,
                'level_2',
                LEVEL2_COMMISSION_RATE
              );
            }
          }
        }
      }

      // Mark commission as paid
      const { error: updateError } = await supabase
        .from('plots')
        .update({ commission_status: 'paid' })
        .eq('id', plot.id);

      if (updateError) throw updateError;

      console.log(`  ✅ Commission distributed and marked as paid`);
    }

    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 Step 4: Verifying Final Results...\n');

    // Get final wallet balances
    const { data: wallets } = await supabase
      .from('wallets')
      .select(`
        owner_id,
        total_balance,
        direct_sale_balance,
        downline_sale_balance,
        profiles!wallets_owner_id_fkey (name)
      `)
      .gt('total_balance', 0);

    if (wallets && wallets.length > 0) {
      console.log('✅ Final Wallet Balances:\n');
      wallets.forEach(wallet => {
        console.log(`${wallet.profiles?.name}:`);
        console.log(`  Total: ₹${wallet.total_balance.toLocaleString('en-IN')}`);
        console.log(`  Direct: ₹${wallet.direct_sale_balance.toLocaleString('en-IN')}`);
        console.log(`  Downline: ₹${wallet.downline_sale_balance.toLocaleString('en-IN')}\n`);
      });

      const totalDistributed = wallets.reduce((sum, w) => sum + w.total_balance, 0);
      console.log(`💰 Total Distributed: ₹${totalDistributed.toLocaleString('en-IN')}`);
    } else {
      console.log('⚠️  No wallets with balance found');
    }

    // Get commission records
    const { data: commissions } = await supabase
      .from('commissions')
      .select('*');

    console.log(`\n📝 Total Commission Records: ${commissions?.length || 0}`);

    // Get transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'credit')
      .ilike('description', '%commission%');

    console.log(`📝 Total Commission Transactions: ${transactions?.length || 0}`);

    console.log('\n✨ Commission fix completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

async function addCommission(userId, userName, plotId, amount, level, rate) {
  try {
    // 1. Add transaction
    const { error: txnError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: userId,
        type: 'credit',
        amount: amount,
        description: `Commission from Plot (${level} - ${rate}%)`,
        date: new Date().toISOString()
      });

    if (txnError) throw txnError;

    // 2. Update wallet
    const walletField = level === 'direct' ? 'direct_sale_balance' : 'downline_sale_balance';
    
    // Get current wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_id', userId)
      .single();

    if (wallet) {
      // Update existing wallet
      const newDirectBalance = walletField === 'direct_sale_balance' 
        ? (wallet.direct_sale_balance || 0) + amount
        : wallet.direct_sale_balance || 0;

      const newDownlineBalance = walletField === 'downline_sale_balance'
        ? (wallet.downline_sale_balance || 0) + amount
        : wallet.downline_sale_balance || 0;

      const newTotalBalance = newDirectBalance + newDownlineBalance;

      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          total_balance: newTotalBalance,
          direct_sale_balance: newDirectBalance,
          downline_sale_balance: newDownlineBalance
        })
        .eq('owner_id', userId);

      if (updateError) throw updateError;
    } else {
      // Create new wallet
      const { error: createError } = await supabase
        .from('wallets')
        .insert({
          owner_id: userId,
          total_balance: amount,
          direct_sale_balance: walletField === 'direct_sale_balance' ? amount : 0,
          downline_sale_balance: walletField === 'downline_sale_balance' ? amount : 0
        });

      if (createError) throw createError;
    }

    return true;
  } catch (error) {
    console.error(`  ❌ Error adding commission for ${userName}:`, error.message);
    return false;
  }
}

// Run the fix
fixCommissions();
