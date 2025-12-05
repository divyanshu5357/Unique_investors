# TESTING CHECKLIST - YOUR NEXT STEPS ✅

**For User Testing the Commission Calculation System**

---

## 📋 Pre-Testing Checklist

Before you start testing, confirm:

- [ ] Development server is running on port 9003
- [ ] You have access to the plot creation form
- [ ] You have access to `/broker/booked-plots` page
- [ ] You have access to `/broker/wallet` page
- [ ] You can view "Projected Commission Wallet" section
- [ ] You understand the formula: Area × ₹1,000 = Direct Commission

---

## 🎯 Test 1: Simple Booked Plot Creation

**Objective:** Create a 300 gaj booked plot and verify projected commission shows correctly

### Steps:

1. **Navigate to plot creation page**
   - URL: `/admin/inventory` or `/broker/plot-create`
   - Or find "Create Plot" button in menu

2. **Fill plot form:**
   ```
   Project Name:    Green Valley (example)
   Type:            Residential
   Block:           Block A
   Plot Number:     P-001
   Dimension:       30 × 10 (or similar)
   Area (gaj):      300  ← KEY FIELD
   Status:          Booked  ← IMPORTANT
   Buyer Name:      Test Buyer
   Booking Amount:  ₹150,000 (or any amount)
   Payment Made:    ₹60,000 (40% of booking)
   Associate/Broker: Select your broker
   ```

3. **Click Save/Create**

4. **Expected Results:**
   - ✅ Plot created successfully
   - ✅ No errors in console
   - ✅ Can see plot in inventory

---

## ✨ Test 2: Verify Projected Commission Wallet

**Objective:** Check that the projected commission shows correctly on Booked Plots page

### Steps:

1. **Navigate to Booked Plots page**
   - URL: `/broker/booked-plots`

2. **Look for "Projected Commission Wallet" section**
   - Should have:
     - 🔒 Lock icon on left
     - Yellow background
     - "LOCKED - Not Withdrawable" badge
     - Total projected amount display

3. **Verify the amount:**
   ```
   Expected: ₹300,000
   Formula: 300 gaj × ₹1,000 = ₹300,000
   
   If showing ₹300,000 → ✅ TEST PASSED
   If showing different amount → ❌ TEST FAILED (record the amount)
   ```

4. **Check the plot list under projected wallet:**
   - Should show your test plot
   - Should show area: 300 gaj
   - Should show projected commission: ₹300,000
   - Should show payment percentage: 40%

---

## 📊 Test 3: Multiple Plots Test

**Objective:** Verify multiple booked plots aggregate correctly

### Steps:

1. **Create three more booked plots:**
   
   Plot 2:
   ```
   Area: 100 gaj
   Status: Booked
   Payment: 50%
   Expected Projected Commission: ₹100,000
   ```
   
   Plot 3:
   ```
   Area: 200 gaj
   Status: Booked
   Payment: 30%
   Expected Projected Commission: ₹200,000
   ```
   
   Plot 4:
   ```
   Area: 150 gaj
   Status: Booked
   Payment: 45%
   Expected Projected Commission: ₹150,000
   ```

2. **Go back to Booked Plots page**

3. **Verify total projection:**
   ```
   Plot 1 (300 gaj): ₹300,000
   Plot 2 (100 gaj): ₹100,000
   Plot 3 (200 gaj): ₹200,000
   Plot 4 (150 gaj): ₹150,000
   ─────────────────────────────
   Total Projected: ₹750,000
   
   If showing ₹750,000 → ✅ TEST PASSED
   If showing different amount → ❌ TEST FAILED (record the amount)
   ```

---

## 🔒 Test 4: Lock Status Verification

**Objective:** Verify commission is locked and cannot be withdrawn

### Steps:

1. **In Projected Commission Wallet section**

2. **Look for:**
   - [ ] Yellow background color
   - [ ] 🔒 Lock icon visible
   - [ ] "LOCKED - Not Withdrawable" badge
   - [ ] NO "Withdraw" button in this section

3. **Try to find a withdraw button:**
   - If you find one → ❌ PROBLEM (should not have one)
   - If you don't find one → ✅ CORRECT

---

## 🎯 Test 5: Threshold Test (75% Payment)

**Objective:** Verify that plots ≥ 75% paid are NOT in projected wallet

### Steps:

1. **Create a new booked plot:**
   ```
   Area: 250 gaj
   Status: Booked
   Payment: 75% exactly
   Expected: NOT in Projected Commission Wallet
   ```

2. **Check Booked Plots page**
   - Projected wallet should NOT include this plot
   - Total should NOT include ₹250,000

3. **Create another booked plot:**
   ```
   Area: 200 gaj
   Status: Booked
   Payment: 76% (just above threshold)
   Expected: NOT in Projected Commission Wallet
   ```

4. **Verify:**
   - ✅ Neither 75% nor 76% plots appear in wallet
   - ✅ Only plots < 75% appear in wallet

---

## 💰 Test 6: Wallet Page Verification

**Objective:** Verify projected commission also appears on Wallet page

### Steps:

1. **Navigate to Wallet page**
   - URL: `/broker/wallet`

2. **Look for "Projected Commission Wallet" section**
   - Should show same total as Booked Plots page
   - Should show same list of plots

3. **Verify totals match:**
   ```
   Booked Plots page total: ₹X
   Wallet page total:       ₹X
   
   If they match → ✅ TEST PASSED
   If different → ❌ TEST FAILED (record both amounts)
   ```

---

## 🧮 Test 7: Manual Calculation Verification

**Objective:** Double-check the math yourself

### Steps:

1. **Pick any booked plot from the list**

2. **Manually calculate:**
   ```
   Area (gaj):     ?
   Rate:           ₹1,000 per gaj
   Expected:       Area × 1,000
   Actual (shown): ?
   ```

3. **Example:**
   ```
   Plot area: 250 gaj
   Calculation: 250 × 1,000 = ₹250,000
   
   If showing ₹250,000 → ✅ CORRECT
   If showing different → ❌ INCORRECT (record amount)
   ```

4. **Repeat for 2-3 more plots**

---

## 🔄 Test 8: Commission Calculation Consistency

**Objective:** Verify the formula is applied consistently

### Steps:

1. **Test different plot sizes:**
   
   - 50 gaj  → Expected: ₹50,000
   - 100 gaj → Expected: ₹100,000
   - 250 gaj → Expected: ₹250,000
   - 500 gaj → Expected: ₹500,000

2. **For each, verify:**
   - [ ] Amount shown matches Area × 1,000
   - [ ] No calculation errors
   - [ ] Consistent formula application

3. **Results:**
   ```
   50 gaj:  Expected ₹50,000  → Actual: ______  ✓/✗
   100 gaj: Expected ₹100,000 → Actual: ______  ✓/✗
   250 gaj: Expected ₹250,000 → Actual: ______  ✓/✗
   500 gaj: Expected ₹500,000 → Actual: ______  ✓/✗
   ```

---

## 📝 Test 9: Payment Percentage Testing

**Objective:** Verify payment percentage affects wallet inclusion

### Steps:

1. **Create plots with different payment percentages:**

   Plot A: 40% paid  → Should appear in wallet ✓
   Plot B: 50% paid  → Should appear in wallet ✓
   Plot C: 74% paid  → Should appear in wallet ✓
   Plot D: 75% paid  → Should NOT appear in wallet ✗
   Plot E: 80% paid  → Should NOT appear in wallet ✗

2. **Verify each plot's inclusion/exclusion in wallet**

3. **Results:**
   ```
   40% paid:  In wallet? ✓/✗
   50% paid:  In wallet? ✓/✗
   74% paid:  In wallet? ✓/✗
   75% paid:  In wallet? ✓/✗
   80% paid:  In wallet? ✓/✗
   ```

---

## 🎯 Test 10: UI Elements Verification

**Objective:** Verify all UI elements are present and working

### Steps:

1. **On Booked Plots page, verify:**
   - [ ] "Projected Commission Wallet" section header visible
   - [ ] 🔒 Lock icon visible
   - [ ] Yellow background applied
   - [ ] "LOCKED - Not Withdrawable" badge shown
   - [ ] Total amount displayed prominently
   - [ ] Plot list shows clearly (plot #, area, commission)
   - [ ] No error messages
   - [ ] Page loads without console errors

2. **Check styling:**
   - [ ] Yellow color applied correctly
   - [ ] Lock icon properly sized
   - [ ] Text readable and clear
   - [ ] Layout looks professional

---

## 📊 Final Checklist

**Before submitting your test results, verify:**

- [ ] All 10 test scenarios completed
- [ ] Recorded actual amounts for each test
- [ ] Checked mathematical accuracy
- [ ] Verified UI elements present
- [ ] No console errors observed
- [ ] All calculations match formula
- [ ] Threshold logic working (75%)
- [ ] Multiple plots aggregating correctly
- [ ] Lock status preventing withdrawals
- [ ] Payment percentage being considered

---

## 📋 Test Result Template

**Fill this out for your testing:**

```
Test Date: ______________
Tester: ______________

Test 1 - Simple Plot (300 gaj @ 40%):
Expected: ₹300,000
Actual: ________________
Result: ✅ PASS / ❌ FAIL

Test 2 - Projected Wallet Visibility:
Expected: Shows ₹300,000 with lock
Actual: ________________
Result: ✅ PASS / ❌ FAIL

Test 3 - Multiple Plots (4 plots):
Expected: Total ₹750,000
Actual: ________________
Result: ✅ PASS / ❌ FAIL

Test 4 - Lock Status:
Expected: No withdraw button, yellow background, lock icon
Actual: ________________
Result: ✅ PASS / ❌ FAIL

Test 5 - Threshold (75% payment):
Expected: Plot NOT in wallet
Actual: ________________
Result: ✅ PASS / ❌ FAIL

Test 6 - Wallet Page Match:
Expected: Same total as Booked Plots page
Actual: ________________
Result: ✅ PASS / ❌ FAIL

Test 7 - Manual Calculation:
Expected: Amount = Area × 1,000
Actual: ________________
Result: ✅ PASS / ❌ FAIL

Test 8 - Consistency (multiple sizes):
Expected: Formula consistent across all
Actual: ________________
Result: ✅ PASS / ❌ FAIL

Test 9 - Payment Percentage Logic:
Expected: Only < 75% in wallet
Actual: ________________
Result: ✅ PASS / ❌ FAIL

Test 10 - UI Elements:
Expected: All elements present and styled
Actual: ________________
Result: ✅ PASS / ❌ FAIL

Overall Result: ✅ ALL PASS / ⚠️ SOME ISSUES / ❌ MAJOR ISSUES
```

---

## ⚠️ If Something Doesn't Match

**If any amount is different from expected:**

1. **Record the issue:**
   - What was expected?
   - What did you see?
   - What is the gaj area?
   - What is the payment percentage?

2. **Check for obvious issues:**
   - Is the area in the database correct?
   - Is the status set to "Booked"?
   - Is the payment percentage < 75%?

3. **Report back with:**
   - Which test failed
   - Expected vs actual amounts
   - Plot area and payment percentage
   - Screenshots if possible

---

## ✅ Expected Outcomes

**If all tests pass, you should see:**

✅ Booked plots with projected commissions  
✅ Amounts calculated correctly (Area × ₹1,000)  
✅ Lock icon and yellow background  
✅ "LOCKED - Not Withdrawable" badge  
✅ Threshold working (< 75% in wallet, ≥ 75% excluded)  
✅ Multiple plots aggregating correctly  
✅ Wallet page showing same total  
✅ No console errors  
✅ Professional UI display  

**If you see all these, the system is working correctly! ✅**

---

## 🚀 You're All Set!

Start with Test 1 and work your way through. Take your time and verify each step carefully.

Good luck! Let me know your results when you're done! 🎯

---

**Reference Documents:**
- `QUICK_COMMISSION_REFERENCE.md` - Quick lookup table
- `COMMISSION_CALCULATION_TEST_REPORT.md` - Detailed analysis
- `MASTER_TEST_REPORT.md` - Complete overview
