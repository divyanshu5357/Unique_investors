# Commission Recalculation - Timestamp Preservation Fix

## Problem
When clicking "Recalculate", the API was deleting commission records and inserting new ones, causing `created_at` timestamps to be replaced with current time.

## Solution Implemented

### 1. Database Protection (Migration)
Created: `supabase/migrations/20241120000004_protect_commission_timestamps.sql`

```sql
CREATE OR REPLACE FUNCTION prevent_created_at_update()
RETURNS trigger AS $$
BEGIN
    NEW.created_at := OLD.created_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_created_at_commissions
BEFORE UPDATE ON commissions
FOR EACH ROW
EXECUTE FUNCTION prevent_created_at_update();

CREATE TRIGGER no_update_created_at_transactions
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION prevent_created_at_update();
```

This trigger ensures that even if code tries to update `created_at`, the database will preserve the original value.

### 2. Run the Migration

```bash
# In your Supabase SQL Editor, run:
supabase/migrations/20241120000004_protect_commission_timestamps.sql
```

Or via Supabase dashboard:
1. Go to SQL Editor
2. Copy the contents of the migration file
3. Execute

### 3. How Recalculation Now Works

The logic in `src/lib/actions.ts` has been updated in `recalculateCommissionForPlot()`:

**BEFORE** (Wrong):
```typescript
// Delete commissions
await supabaseAdmin.from('commissions').delete().eq('plot_id', plot.id);
// Insert new commissions (gets new timestamp!)
await supabaseAdmin.from('commissions').insert(newData);
```

**AFTER** (Correct):
```typescript
// Find existing commission
const existing = await supabaseAdmin
    .from('commissions')
    .select('*')
    .eq('plot_id', plotId)
    .eq('receiver_id', receiverId)
    .eq('level', level)
    .single();

if (existing) {
    // UPDATE existing (timestamp protected by trigger)
    await supabaseAdmin
        .from('commissions')
        .update({
            amount: newAmount,
            percentage: newPercentage,
            // created_at is NOT included - trigger protects it
        })
        .eq('id', existing.id);
} else {
    // Only INSERT if doesn't exist
    await supabaseAdmin
        .from('commissions')
        .insert(newCommissionData);
}
```

### 4. Transaction Timestamp Preservation

For transactions (which must be recreated to update descriptions):

```typescript
// Capture original timestamps before deleting
const { data: existingTransactions } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('plot_id', plotId);

const txTimestamps = new Map();
for (const tx of existingTransactions) {
    txTimestamps.set(`${tx.wallet_id}_${tx.level}`, tx.created_at);
}

// Delete transactions
await supabaseAdmin.from('transactions').delete().eq('plot_id', plotId);

// Recreate with preserved timestamps
await supabaseAdmin.from('transactions').insert({
    ...newTxData,
    created_at: txTimestamps.get(key) // Use preserved timestamp
});
```

## Testing

### Test API Endpoint

```bash
# Recalculate single plot
curl -X POST http://localhost:3000/api/recalculate-commission \
  -H "Content-Type: application/json" \
  -d '{"plotId": "YOUR_PLOT_ID"}'

# Recalculate all sold plots
curl -X GET http://localhost:3000/api/recalculate-commission
```

### Verify Timestamps Preserved

1. Check current timestamps in database:
```sql
SELECT id, receiver_name, level, amount, created_at 
FROM commissions 
WHERE plot_id = 'YOUR_PLOT_ID'
ORDER BY created_at;
```

2. Run recalculate API

3. Check timestamps again - they should be IDENTICAL:
```sql
SELECT id, receiver_name, level, amount, created_at 
FROM commissions 
WHERE plot_id = 'YOUR_PLOT_ID'
ORDER BY created_at;
```

Only `amount` field should change, `created_at` stays the same!

## Key Points

✅ **Database trigger protects timestamps** - Even if code tries to modify, DB prevents it
✅ **UPDATE instead of DELETE/INSERT** - Existing records are updated, not replaced
✅ **Transaction timestamps preserved** - Captured before delete, restored on recreate
✅ **First-time inserts get current timestamp** - Only new commissions get new timestamps
✅ **Wallet balances recalculated correctly** - Old amounts subtracted, new amounts added

## Files Modified

1. **New**: `supabase/migrations/20241120000004_protect_commission_timestamps.sql`
2. **Modified**: `src/lib/actions.ts` - `recalculateCommissionForPlot()` function
3. **Modified**: `src/lib/actions.ts` - `processCommissionCalculation()` function (added update logic)

## Next Steps

1. Run the migration in Supabase
2. Test recalculate button
3. Verify timestamps don't change
4. Monitor for any issues

The timestamps are now **permanently protected** at both the application and database level!
