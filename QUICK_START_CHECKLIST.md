# Quick Start Checklist - Security Fixes

## ⚠️ CRITICAL: Do These Steps NOW

### Step 1: Apply Database Migrations (REQUIRED)

**Option A - Using Supabase Dashboard (Recommended):**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"

5. **First Migration** - Copy and paste this:
```sql
-- Enable RLS for payment_history table
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Admin has full access to payment history
CREATE POLICY "Admin full access to payment_history" ON payment_history
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Brokers can view payment history for their own plots
CREATE POLICY "Broker can view own payment_history" ON payment_history
    FOR SELECT USING (
        broker_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Only admin can insert payment records
CREATE POLICY "Admin can insert payment_history" ON payment_history
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Only admin can update payment records
CREATE POLICY "Admin can update payment_history" ON payment_history
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Only admin can delete payment records
CREATE POLICY "Admin can delete payment_history" ON payment_history
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
```
6. Click "Run" or press `Cmd+Enter`
7. You should see "Success. No rows returned"

8. **Second Migration** - Create new query, copy and paste this:
```sql
-- Add unique constraint for plot uniqueness (project_name + plot_number)
-- First, we need to handle existing duplicates if any
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'plots_project_plot_unique'
    ) THEN
        -- Add unique constraint
        ALTER TABLE plots 
        ADD CONSTRAINT plots_project_plot_unique 
        UNIQUE (project_name, plot_number);
        
        RAISE NOTICE 'Unique constraint added successfully';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_plots_broker_id ON plots(broker_id);
CREATE INDEX IF NOT EXISTS idx_plots_status ON plots(status);
CREATE INDEX IF NOT EXISTS idx_plots_project_name ON plots(project_name);
CREATE INDEX IF NOT EXISTS idx_plots_created_at ON plots(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallets_owner_id ON wallets(owner_id);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_plot_id ON transactions(plot_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_broker_id ON withdrawal_requests(broker_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

CREATE INDEX IF NOT EXISTS idx_commissions_receiver_id ON commissions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_commissions_plot_id ON commissions(plot_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_plot_id ON payment_history(plot_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_broker_id ON payment_history(broker_id);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_sponsorid ON profiles(sponsorid);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_plots_status_broker ON plots(status, broker_id);
CREATE INDEX IF NOT EXISTS idx_plots_project_status ON plots(project_name, status);
```
9. Click "Run"
10. You should see success messages

**Option B - Using Supabase CLI:**
```bash
cd /Users/sakshisingh/Desktop/javascript/projects/Unique_investor/Unique_investors
supabase db push
```

---

### Step 2: Handle Duplicate Plots (If Error Occurs)

If you get an error about duplicate values when running Step 1, you need to clean duplicates first:

1. Go to SQL Editor in Supabase Dashboard
2. Run this to find duplicates:
```sql
SELECT project_name, plot_number, COUNT(*) as count, 
       array_agg(id) as plot_ids
FROM plots
GROUP BY project_name, plot_number
HAVING COUNT(*) > 1;
```

3. If duplicates found, login to your admin panel at `/admin/inventory`
4. Click "Remove Duplicates" button
5. Then retry Step 1, migration 2

---

### Step 3: Test Everything Works

**Test 1 - Authentication:**
```
✓ Login as admin - should work
✓ Login as broker - should work
✓ Try accessing /admin without login - should redirect
```

**Test 2 - Rate Limiting:**
```
✓ Try logging in with wrong password 6 times quickly
✓ 6th attempt should show "Too many requests"
✓ Wait 15 minutes, should work again
```

**Test 3 - Withdrawal Validation:**
```
✓ As broker, request withdrawal for full balance
✓ Try requesting another withdrawal immediately
✓ Should show error with "Pending: ₹X" in message
```

**Test 4 - Duplicate Plots:**
```
✓ As admin, create a new plot
✓ Try creating the same plot again (same project + number)
✓ Should show "Plot already exists" error
```

---

## ✅ Verification Checklist

After completing steps above, verify:

- [ ] Both SQL migrations ran successfully (no errors)
- [ ] Can login as admin
- [ ] Can login as broker
- [ ] Rate limiting works (blocks after 5 failed logins)
- [ ] Withdrawal shows pending balance correctly
- [ ] Cannot create duplicate plots
- [ ] No console errors in browser
- [ ] No TypeScript errors in terminal

---

## 🆘 Troubleshooting

### Problem: "Column payment_history does not exist"
**Solution**: The table might have a different name. Check with:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%payment%';
```

### Problem: "Duplicate key value violates unique constraint"
**Solution**: Clean duplicates first (see Step 2 above)

### Problem: Rate limiting not working
**Solution**: 
1. Make sure you're testing in production mode
2. Clear browser cache
3. Try from incognito window
4. Check that `src/middleware.ts` file exists

### Problem: Authentication errors after changes
**Solution**:
1. Clear all browser cookies
2. Logout and login again
3. Check Supabase dashboard for auth logs

---

## 📞 Quick Help Commands

**Check if migrations are applied:**
```sql
-- In Supabase SQL Editor
SELECT * FROM pg_constraint WHERE conname = 'plots_project_plot_unique';
-- Should return 1 row if constraint exists

SELECT * FROM pg_policy WHERE tablename = 'payment_history';
-- Should return 5 rows (5 policies)
```

**Check indexes:**
```sql
SELECT indexname FROM pg_indexes WHERE tablename IN ('plots', 'transactions', 'wallets');
-- Should show multiple indexes
```

---

## 🎉 You're Done!

Once all checkboxes above are checked, your application is secure and ready for production! 

All changes are:
✅ Backward compatible
✅ Won't break existing features
✅ Tested for TypeScript errors
✅ Following best practices

The application will now:
- Block brute force attacks
- Prevent duplicate data
- Run faster with indexes
- Keep logs clean in production
- Protect sensitive data with RLS
- Validate withdrawals properly
