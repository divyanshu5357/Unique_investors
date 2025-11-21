/**
 * Script to find all orphaned profiles (profiles without auth users)
 * Run with: node scripts/find-orphaned-profiles.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function findOrphanedProfiles() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔍 Checking for orphaned profiles...');
  console.log('');

  // Get all profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*');

  if (profileError) {
    console.error('❌ Error fetching profiles:', profileError.message);
    process.exit(1);
  }

  console.log(`Found ${profiles.length} profiles in database`);

  // Get all auth users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('❌ Error fetching auth users:', authError.message);
    process.exit(1);
  }

  console.log(`Found ${authUsers.users.length} auth users in database`);
  console.log('');

  // Find orphaned profiles
  const authUserIds = new Set(authUsers.users.map(u => u.id));
  const orphanedProfiles = profiles.filter(p => !authUserIds.has(p.id));

  if (orphanedProfiles.length === 0) {
    console.log('✅ No orphaned profiles found! All profiles have corresponding auth users.');
    return;
  }

  console.log(`⚠️  Found ${orphanedProfiles.length} orphaned profile(s):`);
  console.log('');

  orphanedProfiles.forEach((profile, index) => {
    console.log(`${index + 1}. Profile ID: ${profile.id}`);
    console.log(`   Name: ${profile.full_name}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Created: ${new Date(profile.created_at).toLocaleString()}`);
    console.log('');
  });

  console.log('📋 Summary:');
  console.log(`   Total profiles: ${profiles.length}`);
  console.log(`   Valid profiles: ${profiles.length - orphanedProfiles.length}`);
  console.log(`   Orphaned profiles: ${orphanedProfiles.length}`);
  console.log('');
  console.log('💡 To fix orphaned profiles, run:');
  orphanedProfiles.forEach(profile => {
    console.log(`   node scripts/create-auth-for-profile.js ${profile.email} <password>`);
  });
}

findOrphanedProfiles().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
