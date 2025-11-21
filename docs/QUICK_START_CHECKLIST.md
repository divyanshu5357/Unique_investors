# 🚀 Quick Start Checklist

This checklist helps you get your Unique Investors MLM platform up and running with all security fixes applied.

## ✅ Pre-Deployment Checklist

### 1. Database Migrations (CRITICAL)

Run these SQL migrations in your Supabase SQL Editor in order:

#### Step 1: Apply RLS Policy for Payment History
```sql
-- File: supabase/migrations/20241120000001_add_payment_history_rls.sql
-- This adds Row Level Security to payment_history table
```
Open the file and copy-paste the SQL into Supabase SQL Editor, then execute.

#### Step 2: Apply Database Constraints and Indexes
```sql
-- File: supabase/migrations/20241120000002_add_constraints_indexes.sql
-- This adds unique constraints and performance indexes
```
Open the file and copy-paste the SQL into Supabase SQL Editor, then execute.

#### Step 3: Fix Paid Percentage Calculation
```sql
-- File: supabase/migrations/20241120000003_fix_paid_percentage.sql
-- This fixes any incorrect paid_percentage values (like 225.1%)
```
Open the file and copy-paste the SQL into Supabase SQL Editor, then execute.

**How to Run Migrations:**
1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy content from migration file
5. Paste and click "Run"
6. Verify success message
7. Repeat for each migration file

**Verification:**
After running all migrations, verify:
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'payment_history';
-- Should show rowsecurity = true

-- Check for duplicate plots
SELECT project_name, plot_number, COUNT(*) 
FROM plots 
GROUP BY project_name, plot_number 
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Check for incorrect percentages
SELECT * FROM plots WHERE paid_percentage > 100 OR paid_percentage < 0;
-- Should return 0 rows

-- Check indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
-- Should show multiple idx_* indexes
```

### 2. Environment Variables

Ensure these are set in your `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to production URL when deployed
NODE_ENV=development  # Change to 'production' when deployed
```

**Security Note:** 
- Never commit `.env.local` to git
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret (only used server-side)

### 3. Dependencies Installation

```bash
npm install
# or
yarn install
# or
pnpm install
```

Verify all packages are installed:
```bash
npm list --depth=0
```

### 4. TypeScript Verification

Check for any TypeScript errors:
```bash
npx tsc --noEmit
```

Should show: "No errors found"

### 5. Build Test

Test that the application builds successfully:
```bash
npm run build
```

Should complete without errors.

## 🔐 Security Features Verification

### 1. Rate Limiting (Middleware)
File: `src/middleware.ts`

**What it does:**
- Limits login attempts: 5 per 15 minutes
- Limits password resets: 3 per hour  
- Limits withdrawal requests: 10 per hour

**Test:**
1. Try logging in with wrong password 6 times
2. Should get rate limit error on 6th attempt
3. Wait 15 minutes or clear cookies to reset

### 2. Secure Logging
Files: `src/lib/utils/logger.ts`, `src/lib/actions.ts`

**What it does:**
- Only logs in development mode
- Sanitizes sensitive data
- Uses structured logging

**Verify:**
```bash
# In actions.ts, search for console.log
grep -r "console\.log" src/lib/actions.ts
# Should return 0 results

# Search for logger.dev
grep -r "logger\.dev" src/lib/actions.ts
# Should return multiple results
```

### 3. Authentication Flow
File: `src/lib/serverUtils.ts`

**What it does:**
- Uses server client for user authentication
- Uses admin client only for data queries with RLS bypass
- Validates user session on every protected action

**Test:**
1. Try accessing `/broker` without logging in → Should redirect to login
2. Log in as broker → Should access broker dashboard
3. Try accessing `/admin` as broker → Should show "Unauthorized"

### 4. RLS Policies

**What they do:**
- Protect database tables from unauthorized access
- Ensure brokers can only see their own data
- Allow admins to see all data

**Verify RLS is enabled:**
```sql
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

All application tables should have `rowsecurity = true`

## 💰 Withdrawal System Setup

### Understanding the System

The withdrawal system is **100% manual** - there is NO automatic payment gateway.

**Process Flow:**
1. Broker requests withdrawal from available balance
2. Request goes to admin for review
3. Admin processes payment outside the system (bank transfer, UPI, cash, cheque)
4. Admin approves request in system with transaction proof
5. Broker's balance is deducted

**Read Full Guide:** See `docs/WITHDRAWAL_SYSTEM_GUIDE.md`

### Testing Withdrawal Flow

**As Broker:**
1. Navigate to **Broker → Transactions**
2. Click "Request Withdrawal"
3. Enter amount (must be ≤ available balance)
4. Add note with bank details
5. Submit request
6. Should see request in "Withdrawal Requests" tab with "Pending" status

**As Admin:**
1. Navigate to **Admin → Transactions**
2. Should see pending withdrawal requests
3. Click "Approve" on a request
4. Select payment type (Cash/Cheque/Online Transfer)
5. Upload proof image URL (optional)
6. Submit approval
7. Request should change to "Approved"
8. Broker's balance should be reduced

**As Broker (Verification):**
1. Check **Broker → Wallets** - balance should be reduced
2. Check **Broker → Transactions** - should see withdrawal transaction
3. Request status should show "Approved"

### Commission Calculation

Commissions are calculated when plots reach "Sold" status (≥75% payment):

**Levels:**
- Direct Sale: 6% commission
- Level 1 (Direct downline): 2% commission
- Level 2 (Downline of downline): 0.5% commission

**Manual Recalculation:**
If commissions seem incorrect, admin can recalculate:
1. Navigate to **Admin → Dashboard** (if function exposed)
2. Or run via API: `POST /api/admin/recalculate-commissions`
3. Or run SQL: `SELECT calculate_commission_for_sold_plots()`

## 🐛 Troubleshooting Common Issues

### Issue: "Insufficient available balance"

**Problem:** Broker can't request withdrawal even though balance shows enough

**Solution:**
- Check for pending withdrawal requests
- Available balance = Total balance - Pending withdrawals
- Wait for admin to process pending requests first
- Or cancel pending request and create new one

### Issue: Paid Percentage Shows Wrong Value (e.g., 225.1%)

**Problem:** Plot shows impossible percentage like 225.1%

**Solution:**
1. Run the fix migration: `20241120000003_fix_paid_percentage.sql`
2. This recalculates all percentages based on actual payments
3. Verify with query:
```sql
SELECT * FROM plots WHERE paid_percentage > 100;
```
Should return 0 rows after fix.

### Issue: Broker Can't Refer New Person (RLS Error)

**Problem:** "RLS policy violation" when broker tries to refer someone

**Solution:**
- This was fixed in `serverUtils.ts`
- Ensure you have latest code from security fixes
- Restart development server: `npm run dev`

### Issue: Rate Limit Error

**Problem:** "Too many requests" error

**Solution:**
- Wait for rate limit window to expire (see error message)
- For development, you can temporarily disable rate limiting in `middleware.ts`
- For production, this is a security feature - keep it enabled

### Issue: Commission Not Added After Plot Sold

**Problem:** Plot status is "Sold" but broker didn't receive commission

**Solution:**
1. Check plot's `commission_status` in database:
```sql
SELECT id, project_name, plot_number, status, commission_status, paid_percentage 
FROM plots 
WHERE status = 'sold' AND commission_status IS NULL;
```

2. If commissions are missing, run manual calculation:
- Admin can trigger recalculation
- Or run SQL function if available

### Issue: TypeScript Errors

**Problem:** `npm run build` fails with TypeScript errors

**Solution:**
1. Check for missing imports
2. Verify all types are correct
3. Run: `npx tsc --noEmit` to see specific errors
4. Common fixes:
   - Import missing types from `@/lib/types`
   - Add proper type annotations
   - Check for deprecated API usage

## 📱 Features to Test

### Broker Features
- ✅ Login/Logout
- ✅ View dashboard with downline tree
- ✅ View wallets (Direct Sale + Downline Sale)
- ✅ View transaction history
- ✅ Request withdrawal
- ✅ View withdrawal request status
- ✅ View commissions earned
- ✅ View performance summary
- ✅ Refer new brokers
- ✅ Submit verification documents

### Admin Features
- ✅ Login/Logout
- ✅ View all brokers
- ✅ Add/Edit/Delete plots
- ✅ Add payments to plots
- ✅ View all withdrawal requests
- ✅ Approve/Reject withdrawal requests
- ✅ View all transactions
- ✅ Process broker verifications
- ✅ Process broker referral requests
- ✅ View dashboard analytics
- ✅ Manage booked plots

## 🚀 Deployment

### Pre-Deployment
1. ✅ All migrations applied
2. ✅ All tests passing
3. ✅ No TypeScript errors
4. ✅ Build successful
5. ✅ Environment variables set

### Deployment Steps
1. Set production environment variables
2. Deploy to hosting platform (Vercel, Netlify, etc.)
3. Update Supabase URL allowlist
4. Test production site
5. Monitor logs for errors

### Post-Deployment Verification
1. Test login with real accounts
2. Test withdrawal flow end-to-end
3. Check database for errors
4. Monitor rate limiting effectiveness
5. Verify RLS policies working

## 📚 Documentation References

- **Withdrawal System**: `docs/WITHDRAWAL_SYSTEM_GUIDE.md`
- **Security Fixes**: `docs/SECURITY_FIXES_SUMMARY.md` (if exists)
- **Blueprint**: `docs/blueprint.md`
- **Password Reset**: `docs/QUICK_START_PASSWORD_RESET.md`

## 🆘 Getting Help

If you encounter issues:
1. Check this checklist first
2. Review error logs in Supabase
3. Check browser console for client errors
4. Review server logs
5. Verify all migrations are applied
6. Check environment variables

---

**Last Updated**: November 2024  
**Version**: 2.0 (with Security Fixes & Withdrawal System)
