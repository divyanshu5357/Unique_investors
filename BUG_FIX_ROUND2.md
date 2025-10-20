# 🔧 Commission Calculation Bug Fix - Round 2

## Date: October 20, 2025

## Problem Found

After the initial fix, testing revealed that commissions were still not calculated correctly:

### Symptoms:
- Only 1 out of 2 sold plots received commission
- Plot #20 (₹50,00,000) - Commission NOT distributed
- Plot #9 (₹2,00,000) - Commission distributed (₹12,000)
- Total should be ₹3,12,000 but only ₹12,000 was distributed

### Root Cause:

The code was using **`updated_by`** (admin who last edited) instead of **`broker_id`** (broker who should receive commission).

**Example:**
- Plot #20: `broker_id` = Vikas kashyap, `updated_by` = Admin
- System paid commission to Admin instead of Vikas!

## Bugs Fixed

### 1. `recalculateCommissionForPlot()` Function
**File:** `src/lib/actions.ts` (Line ~2555)

**Before:**
```typescript
if (!plot.updated_by) {
    throw new Error('No broker information found');
}

const result = await processCommissionCalculation(
    plot.updated_by,  // ❌ WRONG
    plot.sale_price,
    ...
);
```

**After:**
```typescript
// Use broker_id for booked plots, fall back to updated_by for old plots
const brokerId = plot.broker_id || plot.updated_by;
const saleAmount = plot.total_plot_amount || plot.sale_price;

if (!brokerId) {
    throw new Error('No broker information found');
}

const result = await processCommissionCalculation(
    brokerId,  // ✅ CORRECT
    saleAmount,
    ...
);
```

### 2. `calculateCommissionForSoldPlots()` Function
**File:** `src/lib/actions.ts` (Line ~2465)

**Before:**
```typescript
const { data: soldPlots } = await supabaseAdmin
    .from('plots')
    .select('*')
    .eq('status', 'sold')
    .not('updated_by', 'is', null)  // ❌ WRONG FILTER
    .not('sale_price', 'is', null);

// ... later ...
const result = await processCommissionCalculation(
    plot.updated_by,  // ❌ WRONG
    plot.sale_price,
    ...
);

totalCommissionDistributed += (plot.sale_price * rate) / 100;  // ❌ WRONG
```

**After:**
```typescript
const { data: soldPlots } = await supabaseAdmin
    .from('plots')
    .select('*')
    .eq('status', 'sold');

// Filter plots that have broker information
const plotsWithBroker = soldPlots.filter(plot => 
    plot.broker_id || plot.updated_by
);

// ... later ...
const brokerId = plot.broker_id || plot.updated_by;
const saleAmount = plot.total_plot_amount || plot.sale_price;

const result = await processCommissionCalculation(
    brokerId,  // ✅ CORRECT
    saleAmount,
    ...
);

totalCommissionDistributed += (saleAmount * rate) / 100;  // ✅ CORRECT
```

## Why This Happened

### Database Schema Confusion:
- **Old Sold Plots**: Only had `updated_by` field
- **New Booked Plots**: Have `broker_id` AND `total_plot_amount`
- Code was written for old schema, didn't adapt to new fields

### The Mix:
```
Plot #9  : Old style (updated_by, sale_price) ✅ Worked
Plot #20 : New style (broker_id, total_plot_amount) ❌ Broken
```

## What Changed

### For Broker Identification:
```typescript
// OLD: Always use updated_by
const brokerId = plot.updated_by;

// NEW: Prefer broker_id, fallback to updated_by
const brokerId = plot.broker_id || plot.updated_by;
```

### For Sale Amount:
```typescript
// OLD: Always use sale_price
const amount = plot.sale_price;

// NEW: Prefer total_plot_amount, fallback to sale_price
const amount = plot.total_plot_amount || plot.sale_price;
```

## Expected Results After Fix

### Plot #20 (Green Enclave):
- Broker: **Vikas kashyap**
- Amount: ₹50,00,000
- Commission:
  - Direct (6%): ₹3,00,000 to Vikas
  - Level 1 (2%): ₹1,00,000 to his upline (if exists)
  - Level 2 (0.5%): ₹25,000 to level 2 upline (if exists)

### Plot #9 (Green Enclave):
- Broker: **shubham kashyap**
- Amount: ₹2,00,000
- Commission:
  - Direct (6%): ₹12,000 to shubham ✅ Already paid
  - Level 1 (2%): ₹4,000 to his upline ✅ Already paid
  - Level 2 (0.5%): ₹1,000 to level 2 upline (if exists)

### Total Expected:
```
Plot #20: ₹3,00,000 (direct) + upline commissions
Plot #9:  ₹12,000 (already distributed)
TOTAL:    ₹3,12,000+ (depending on upline structure)
```

## How to Apply the Fix

### Step 1: Ensure Server is Running
```powershell
cd C:\Users\DIVYANSHU\OneDrive\Desktop\projects\unique-invester\Unique_investors
npm run dev
```

### Step 2: Run Recalculation Script
```powershell
node recalculate-all-commissions.js
```

This will:
1. ✅ Clear all existing commissions
2. ✅ Reset all wallet balances
3. ✅ Recalculate using correct logic (broker_id)
4. ✅ Use correct amounts (total_plot_amount)
5. ✅ Display verification results

### Step 3: Verify Results
Check Admin Dashboard:
- **Total Balance**: Should be ₹3,16,000 (₹3,00,000 + ₹12,000 + ₹4,000)
- **Vikas kashyap**: ₹3,00,000 direct
- **shubham kashyap**: ₹12,000 direct

## Files Modified

1. **`src/lib/actions.ts`**:
   - `recalculateCommissionForPlot()` - Fixed broker/amount logic
   - `calculateCommissionForSoldPlots()` - Fixed filtering and calculations

2. **Scripts Created**:
   - `debug-commission-calculation.js` - Debug tool
   - `recalculate-all-commissions.js` - Fix application tool

## Prevention

### Code Review Checklist:
- [ ] Always use `broker_id` for commission recipient
- [ ] Use `total_plot_amount` for booked plots
- [ ] Use `sale_price` only for legacy sold plots
- [ ] Test with both old and new plot types
- [ ] Verify all brokers receive correct amounts

### Database Best Practice:
- Always populate `broker_id` when creating/updating plots
- Migrate old plots to have `broker_id` set
- Consider deprecating `updated_by` for commission logic

## Summary

**Root Cause**: Using `updated_by` (admin) instead of `broker_id` (broker)

**Impact**: 50% of commissions not distributed (Plot #20 missed)

**Fix**: Changed code to prefer `broker_id`, fallback to `updated_by`

**Status**: ✅ Code Fixed, ⏳ Awaiting Recalculation

**Next Step**: Run `recalculate-all-commissions.js` to apply fix

---

**Date Fixed**: October 20, 2025  
**Severity**: High (Money distribution error)  
**Affected**: All booked plots with payments >= 75%  
**Resolution**: Code fixed, manual recalculation required
