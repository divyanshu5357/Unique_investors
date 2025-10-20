/**
 * Fix Plot #20 Status
 * 
 * Problem: Plot #20 is marked as "sold" but only 88% paid
 * Solution: Change back to "booked" so remaining 12% can be collected
 * 
 * Commission already distributed (✅ correct)
 * Just need to change status back to "booked"
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPlot20() {
  console.log('🔧 Fixing Plot #20 Status\n');

  try {
    // Get Plot #20 details
    console.log('📊 Checking Plot #20 current status...');
    const { data: plot, error: plotError } = await supabase
      .from('plots')
      .select('*')
      .eq('plot_number', '20')
      .eq('project_name', 'Green Enclave')
      .single();

    if (plotError) throw plotError;

    console.log(`\nCurrent Status:`);
    console.log(`  Plot Number: ${plot.plot_number}`);
    console.log(`  Project: ${plot.project_name}`);
    console.log(`  Status: ${plot.status}`);
    console.log(`  Total Amount: ₹${plot.total_plot_amount?.toLocaleString('en-IN')}`);
    console.log(`  Paid Percentage: ${plot.paid_percentage}%`);
    console.log(`  Commission Status: ${plot.commission_status}`);

    // Get total payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payment_history')
      .select('amount_received')
      .eq('plot_id', plot.id);

    if (paymentsError) throw paymentsError;

    const totalPaid = payments.reduce((sum, p) => sum + (p.amount_received || 0), 0);
    const paidPercentage = (totalPaid / plot.total_plot_amount) * 100;

    console.log(`  Total Paid: ₹${totalPaid.toLocaleString('en-IN')}`);
    console.log(`  Actual Paid %: ${paidPercentage.toFixed(2)}%`);
    console.log(`  Remaining: ₹${(plot.total_plot_amount - totalPaid).toLocaleString('en-IN')}`);

    if (paidPercentage >= 100) {
      console.log('\n✅ Plot is 100% paid - Status should be "sold"');
      console.log('No changes needed.');
      return;
    }

    if (plot.status.toLowerCase() === 'booked') {
      console.log('\n✅ Plot is already in "booked" status');
      console.log('No changes needed.');
      return;
    }

    // Change status back to booked
    console.log('\n🔄 Changing status from "sold" back to "booked"...');
    console.log('   (Commission already distributed - keeping commission_status as "paid")');

    const { error: updateError } = await supabase
      .from('plots')
      .update({ 
        status: 'booked'
        // Keep commission_status as 'paid' since commission was correctly distributed
      })
      .eq('id', plot.id);

    if (updateError) throw updateError;

    console.log('\n✅ Plot #20 status changed to "booked"');
    console.log('\n📋 Summary:');
    console.log(`  ✅ Commission: Already paid (₹3,00,000 to Vikas)`);
    console.log(`  ✅ Status: Changed to "booked"`);
    console.log(`  ✅ Can now: Continue receiving remaining ${(100 - paidPercentage).toFixed(2)}% payment`);
    console.log(`  💰 Remaining: ₹${(plot.total_plot_amount - totalPaid).toLocaleString('en-IN')}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

fixPlot20();
