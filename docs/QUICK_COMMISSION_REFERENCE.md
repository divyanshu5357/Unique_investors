# QUICK REFERENCE - COMMISSION CALCULATIONS ⚡

**Print this or keep it nearby while testing!**

---

## 🎯 Commission Formula (Simple!)

```
DIRECT = Area (gaj) × ₹1,000
```

That's it! For booked plots, this is what shows in the Projected Commission Wallet.

---

## 📊 Common Amounts (Quick Reference)

| Plot Size | Direct Commission | In Wallet |
|---|---|---|
| 50 gaj | ₹50,000 | ₹50,000 🔒 |
| 75 gaj | ₹75,000 | ₹75,000 🔒 |
| 100 gaj | ₹100,000 | ₹100,000 🔒 |
| 150 gaj | ₹150,000 | ₹150,000 🔒 |
| 200 gaj | ₹200,000 | ₹200,000 🔒 |
| 250 gaj | ₹250,000 | ₹250,000 🔒 |
| 300 gaj | ₹300,000 | ₹300,000 🔒 |
| 350 gaj | ₹350,000 | ₹350,000 🔒 |
| 400 gaj | ₹400,000 | ₹400,000 🔒 |
| 500 gaj | ₹500,000 | ₹500,000 🔒 |

🔒 = Locked in Projected Commission Wallet (for < 75% paid bookings)

---

## 🧮 How to Calculate Yourself

### Example 1: 200 gaj plot
```
200 gaj × ₹1,000 = ₹200,000
```

### Example 2: 350 gaj plot
```
350 gaj × ₹1,000 = ₹350,000
```

### Example 3: 125 gaj plot
```
125 gaj × ₹1,000 = ₹125,000
```

---

## ✨ What to Check When Testing

### When Creating a Booked Plot

1. **Create the plot**
   - Set status: "Booked"
   - Set payment: 40% (or any value < 75%)
   - Enter area: e.g., 300 gaj

2. **Go to Booked Plots page**
   - Find your plot in the list
   - Check projected commission amount

3. **Verify the Math**
   ```
   Expected: 300 × 1,000 = ₹300,000
   Should Match: What you see on screen
   ```

4. **Check the Lock Status**
   - Should see: Yellow badge "LOCKED - Not Withdrawable"
   - Should NOT be able to withdraw
   - Should be in "Projected Commission Wallet" section

---

## 🎯 Test Scenarios

### Scenario A: 100 gaj @ 50% Paid
```
✓ Area: 100 gaj
✓ Status: Booked
✓ Paid: 50%

Expected in Projected Wallet: ₹100,000
Formula: 100 × 1,000 = ₹100,000
Status: LOCKED 🔒

Result: ✅ Should appear in projected wallet
```

### Scenario B: 300 gaj @ 25% Paid
```
✓ Area: 300 gaj
✓ Status: Booked
✓ Paid: 25%

Expected in Projected Wallet: ₹300,000
Formula: 300 × 1,000 = ₹300,000
Status: LOCKED 🔒

Result: ✅ Should appear in projected wallet
```

### Scenario C: 250 gaj @ 75% Paid
```
✓ Area: 250 gaj
✓ Status: Booked
✓ Paid: 75%

Expected in Projected Wallet: NOT INCLUDED
Status: Ready for payout (but still locked)

Result: ✅ Should NOT appear in projected wallet
```

### Scenario D: 150 gaj @ 40% Paid
```
✓ Area: 150 gaj
✓ Status: Booked
✓ Paid: 40%

Expected in Projected Wallet: ₹150,000
Formula: 150 × 1,000 = ₹150,000
Status: LOCKED 🔒

Result: ✅ Should appear in projected wallet
```

---

## 🔢 Quick Math Tips

### To multiply by 1,000 (easier in your head):
- 50 → ₹50,000 (just add 3 zeros)
- 100 → ₹100,000 (just add 3 zeros)
- 300 → ₹300,000 (just add 3 zeros)
- 500 → ₹500,000 (just add 3 zeros)

### For non-round numbers:
- 75 gaj → 75 × 1,000 = ₹75,000
- 125 gaj → 125 × 1,000 = ₹125,000
- 175 gaj → 175 × 1,000 = ₹175,000
- 225 gaj → 225 × 1,000 = ₹225,000

---

## 📍 Where to Check Results

### Location 1: Booked Plots Page
- **URL Path:** `/broker/booked-plots`
- **Section:** "Projected Commission Wallet"
- **What you'll see:**
  - 🔒 Lock icon
  - Yellow background
  - "LOCKED - Not Withdrawable" badge
  - Plot-wise breakdown
  - Total projected amount

### Location 2: Wallet Page
- **URL Path:** `/broker/wallet`
- **Section:** "Projected Commission Wallet"
- **What you'll see:**
  - Same projected wallet (if < 75% paid plots exist)
  - Total projected balance
  - Status information

---

## ✅ Checklist While Testing

- [ ] Commission formula calculation is correct (Area × 1,000)
- [ ] Projected wallet shows only Direct commission (not Level 1/2)
- [ ] Amount is locked (no withdraw button)
- [ ] Yellow lock icon is visible
- [ ] "LOCKED - Not Withdrawable" badge is shown
- [ ] Multiple plots add up correctly
- [ ] Plots ≥ 75% paid are NOT in projected wallet
- [ ] Plots < 75% paid ARE in projected wallet
- [ ] Total amount matches sum of individual plots
- [ ] No calculation errors or rounding issues

---

## 🎓 Understanding the System

### The Three Commission Levels (For Reference)

When a plot is **SOLD**, these all get distributed:

| Recipient | Rate | Example (300 gaj) |
|---|---|---|
| **Broker** (Direct) | ₹1,000/gaj | 300 × 1,000 = ₹300,000 |
| **Broker's Upline** (Level 1) | ₹200/gaj | 300 × 200 = ₹60,000 |
| **Upline's Upline** (Level 2) | ₹50/gaj | 300 × 50 = ₹15,000 |

**But for BOOKED plots < 75% paid:**
- ✓ Only Direct commission shown: ₹300,000
- ✗ Level 1 & Level 2 hidden (wait for sale)
- 🔒 Amount is locked

---

## 📞 If Something Doesn't Match

**Expected:** 300 gaj → ₹300,000  
**Seeing:** Different amount → Check:
1. Is area in the database correct? (Check plot details)
2. Is it a booked plot? (Status should be "Booked")
3. Is payment < 75%? (Should be in projected wallet)
4. Is it the right section? (Should be "Projected Commission Wallet")

---

## ⚡ Quick Test Steps

```
1. Go to Create Plot page
2. Enter: Project, Block, Plot#, Area=300gaj
3. Set Status: Booked
4. Set Payment: 50%
5. Set Buyer Name: Test Buyer
6. Set Broker: Your broker
7. Click Save
8. Go to Booked Plots page
9. Look for "Projected Commission Wallet" section
10. Expected to see: ₹300,000
11. Verify: Yellow lock icon + "LOCKED" badge
12. ✅ TEST PASSED if all match!
```

---

**Ready to test? Go create a booked plot and check the Projected Commission Wallet! 🚀**

*Formula Reference: Area (gaj) × ₹1,000 = Direct Commission*
