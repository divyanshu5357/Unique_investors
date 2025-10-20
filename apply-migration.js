/**
 * Apply Database Migration
 * 
 * This script applies the SQL migration to fix the plot status trigger
 * Changes: Status only changes to "sold" at 100% payment (not 75%)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('📦 Applying Database Migration\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241020120000_fix_plot_status_trigger.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Migration SQL:');
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));
    console.log('');

    console.log('🔄 Executing migration...');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct execution (for service role)
      console.log('Note: exec_sql RPC not available, trying direct SQL execution...');
      
      // Since we can't execute arbitrary SQL via the JS client safely,
      // we'll need to use the Supabase SQL Editor or CLI
      console.log('\n⚠️  Please execute this migration manually:');
      console.log('\n1. Go to your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the SQL from:');
      console.log(`   ${migrationPath}`);
      console.log('4. Click "Run"\n');
      
      console.log('OR use Supabase CLI:');
      console.log('   supabase db push\n');
      
      return;
    }

    console.log('✅ Migration applied successfully!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Plot status trigger updated');
    console.log('  ✅ Status changes to "sold" only at 100% payment');
    console.log('  ✅ Commission still distributed at 75% (by app code)');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

applyMigration();
