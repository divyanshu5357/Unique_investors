# Booked Plot Payment Commission Fix

## Problem Description
When a booked plot payment exceeded 75% of the total amount:
1. ✅ The plot status was correctly updated from "booked" to "sold" (by database trigger)
2. ❌ The commission was NOT being transferred to the broker account
3. ❌ The status was shown as "sold" but commission_status remained "pending"

## Root Cause
The issue was in the `triggerCommissionDistribution()` function in `src/lib/actions.ts`. This function was:
1. Using incorrect RPC function calls (`upsert_seller_commission`, `upsert_upline_commission`) that don't exist or have wrong parameters
2. Not properly using the existing `processCommissionCalculation()` function that handles all commission distribution logic

## Solution Implemented

### 1. Fixed `triggerCommissionDistribution()` function (Line ~2880)
**Before:**
- Tried to use non-existent RPC functions
- Had complex logic duplicating commission calculation
- Would fail silently without proper error handling

**After:**
- Now uses the existing `processCommissionCalculation()` function
- Properly handles errors with detailed logging
- Marks commission as 'paid' only after successful distribution
- Includes comprehensive console logging for debugging

### 2. Enhanced `addPaymentToPlot()` function (Line ~2816)
**Before:**
- Immediately checked plot status after payment insert
- Might miss the trigger completion due to timing

**After:**
- Adds 500ms delay to allow database trigger to complete
- Includes detailed logging of plot status checks
- Properly revalidates all affected pages (brokers, associates, etc.)
- Better error handling and status tracking

## How Commission Distribution Works Now

### Flow:
1. **Payment Added** → `addPaymentToPlot()` is called
2. **Database Trigger** → `update_plot_payment_status()` calculates:
   - Total paid amount
   - Paid percentage
   - Remaining amount
   - If >= 75%, changes status to "sold"
3. **Status Check** → After 500ms delay, checks if plot became "sold"
4. **Commission Distribution** → If sold and commission pending:
   - Calls `processCommissionCalculation()`
   - Distributes commission using MLM structure:
     - 6% to direct seller (broker)
     - 2% to level 1 upline
     - 0.5% to level 2 upline
   - Updates broker wallets
   - Creates transaction records
   - Marks commission_status as "paid"

## Commission Structure (MLM)
- **Direct Seller (Broker)**: 6% of total_plot_amount
- **Level 1 Upline**: 2% of total_plot_amount
- **Level 2 Upline**: 0.5% of total_plot_amount
- **Level 3+**: 0% (no commission)

## Database Trigger Details
**Trigger:** `trigger_update_payment_status` on `payment_history` table
**Function:** `update_plot_payment_status()`
**Actions:**
- Calculates total paid from all payment_history records
- Updates `paid_percentage` and `remaining_amount`
- Changes status to 'sold' when paid_percentage >= 75%

## Testing the Fix

### Test Scenario 1: New Payment Exceeding 75%
1. Go to Admin → Booked Plots
2. Select a plot with < 75% paid
3. Add a payment that brings total to >= 75%
4. **Expected Result:**
   - Plot status changes to "sold"
   - Commission is distributed to broker's wallet
   - Transaction records are created
   - commission_status becomes "paid"

### Test Scenario 2: Check Broker Wallet
1. Go to Admin → Brokers/Associates
2. Find the broker who sold the plot
3. **Expected Result:**
   - Direct Sale Balance increased by 6% of total_plot_amount
   - Total Balance reflects the commission

### Test Scenario 3: Check Upline Commissions
1. If broker has an upline, check their wallet
2. **Expected Result:**
   - Downline Sale Balance increased by 2% (level 1) or 0.5% (level 2)

## Debugging
If issues persist, check the server console logs for:
- `💰 Triggering commission distribution for plot`
- `✅ Commission distributed successfully`
- `❌ Error in triggerCommissionDistribution`

Look for detailed logging showing:
- Plot details (project, plot number, sold amount, broker ID)
- Commission calculation results
- Wallet update status

## Files Modified
1. `src/lib/actions.ts`:
   - Function `triggerCommissionDistribution()` (line ~2880)
   - Function `addPaymentToPlot()` (line ~2816)

## Database Schema
**Relevant Tables:**
- `plots`: Contains booking/payment tracking fields
- `payment_history`: Tracks all payments for booked plots
- `wallets`: Stores broker commission balances
- `transactions`: Records all commission transactions
- `commissions`: Tracks commission distribution details

**Key Columns in plots:**
- `total_plot_amount`: Total price of plot
- `booking_amount`: Initial payment
- `remaining_amount`: Amount left to pay
- `paid_percentage`: Calculated percentage paid
- `commission_status`: 'pending' or 'paid'
- `status`: 'available', 'booked', 'sold', 'reserved'

## Additional Notes
- Commission is only distributed once per plot
- The `commission_status` field prevents duplicate distributions
- All commission calculations use the `processCommissionCalculation()` function
- The system supports multi-level marketing (MLM) structure with uplines
- Wallet updates are atomic to prevent race conditions
