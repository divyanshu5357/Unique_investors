# 🔧 Commission Distribution Fix - Quick Guide

## Problem Summary
Booked plots that reached 75%+ payment were:
- ✅ Correctly updating to "sold" status
- ❌ NOT distributing commission to broker accounts
- ❌ Commission status stayed as "pending"

## What Was Fixed

### 1. Fixed Commission Distribution Function
The `triggerCommissionDistribution()` function was rewritten to:
- Use the correct `processCommissionCalculation()` function
- Properly handle errors and logging
- Mark commission as "paid" after successful distribution

### 2. Enhanced Payment Processing
The `addPaymentToPlot()` function now:
- Waits for database trigger to complete (500ms delay)
- Properly checks if plot became "sold"
- Automatically triggers commission distribution
- Includes comprehensive logging

## Files Changed
- ✏️ `src/lib/actions.ts` (2 functions updated)
- 📄 `COMMISSION_FIX.md` (detailed documentation)
- 🧪 `test-commission-fix.js` (test script)
- 🔧 `manual-commission-fix.js` (manual fix script)

## How to Test the Fix

### Option 1: Test with a New Payment
1. Start your development server: `npm run dev`
2. Go to **Admin → Booked Plots**
3. Find a plot with payment < 75%
4. Click "💰 Payment" button
5. Add a payment that brings total to ≥ 75%
6. **Expected Result:**
   - Plot status changes to "sold"
   - Commission appears in broker's wallet
   - Commission status becomes "paid"

### Option 2: Use Test Script
```bash
node test-commission-fix.js
```
This will check for:
- Booked plots stuck at ≥75%
- Sold plots with pending commissions
- Recent commission transactions

### Option 3: Use Manual Fix Script
```bash
node manual-commission-fix.js
```
This will:
- Find all plots needing commission distribution
- Automatically trigger the fix for each one
- Show results and next steps

## How to Fix Existing Stuck Commissions

If you have plots that are already stuck (sold but commission pending):

### Method 1: Add Another Payment (Recommended)
1. Go to Admin → Booked Plots
2. Find the stuck plot
3. Add a small payment (even ₹1)
4. This will trigger the commission distribution

### Method 2: Use Recalculate API
Send POST request to:
```
POST /api/recalculate-commission
{
  "plotId": "plot-uuid-here"
}
```

### Method 3: Use Manual Fix Script
```bash
node manual-commission-fix.js
```

## Commission Structure

When a plot reaches 75% payment and converts to "sold":
- **Direct Seller (Broker)**: 6% of total amount → Direct Sale Balance
- **Level 1 Upline**: 2% of total amount → Downline Sale Balance
- **Level 2 Upline**: 0.5% of total amount → Downline Sale Balance
- **Level 3+**: 0% (no commission)

Example: Plot worth ₹10,00,000 reaches 75% (₹7,50,000 paid)
- Direct Seller gets: ₹60,000 (6% of ₹10,00,000)
- Level 1 Upline gets: ₹20,000 (2% of ₹10,00,000)
- Level 2 Upline gets: ₹5,000 (0.5% of ₹10,00,000)

## Where to Check Results

### Broker Wallet Balances
**Admin → Brokers/Associates**
- Check "Direct Balance" for direct seller
- Check "Downline Balance" for uplines
- Check "Total Balance" for overall

### Transaction History
**Admin → Transactions** or **Broker → Transactions**
- Look for "Direct commission from plot sale"
- Look for "Level X commission from [broker]'s sale"

### Plot Status
**Admin → Booked Plots** or **Admin → Inventory**
- Status should show "sold"
- Commission should show "Paid" or "✅"

## Troubleshooting

### Issue: Plot at 75%+ but still shows "booked"
**Solution:** The database trigger might not have fired. Add another payment to trigger it.

### Issue: Plot shows "sold" but commission still "pending"
**Solution:** Run the manual fix script or add another payment.

### Issue: No commission in broker wallet
**Possible causes:**
1. Commission distribution failed (check console logs)
2. Broker ID is missing on the plot
3. Database permissions issue

**Solution:** Check server logs for errors, then try manual fix script.

## Console Logs to Watch

When working correctly, you should see:
```
💰 Triggering commission distribution for plot...
📊 Plot Details: { project, plotNumber, soldAmount, brokerId }
💰 Calculating seller commission: [amount]
✅ Updated wallet for seller: [id]
✅ Transaction record created for seller
✅ Commission distributed successfully
```

## Prevention

To prevent this issue from happening again:
1. ✅ Always test payment processing in development first
2. ✅ Check broker wallet after marking plots as sold
3. ✅ Monitor the commission_status field
4. ✅ Review server logs for any errors

## Need Help?

If the issue persists:
1. Check server console logs for errors
2. Verify database trigger is working: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'trigger_update_payment_status';`
3. Check if `processCommissionCalculation` function works correctly
4. Verify broker has upline structure set up (check profiles.uplineId)

## Additional Resources

- 📄 `COMMISSION_FIX.md` - Detailed technical documentation
- 🗄️ `supabase/migrations/20241020000002_add_booked_plots_system.sql` - Database schema
- 💻 `src/lib/actions.ts` - Commission calculation logic
