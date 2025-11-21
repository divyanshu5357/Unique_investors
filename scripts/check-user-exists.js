/**
 * Diagnostic script to check if a user exists in Supabase auth.users table
 * Run with: node scripts/check-user-exists.js vikas@broker.com
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/check-user-exists.js <email>');
  process.exit(1);
}

async function checkUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
    process.exit(1);
  }

  console.log('🔍 Checking Supabase for user:', email);
  console.log('');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Check auth.users table
  console.log('1️⃣ Checking auth.users table...');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error fetching auth users:', authError.message);
    process.exit(1);
  }

  const authUser = authUsers.users.find(u => u.email === email);
  
  if (authUser) {
    console.log('✅ Found in auth.users:');
    console.log('   ID:', authUser.id);
    console.log('   Email:', authUser.email);
    console.log('   Created:', new Date(authUser.created_at).toLocaleString());
    console.log('   Email Confirmed:', authUser.email_confirmed_at ? 'Yes' : 'No');
    console.log('   Last Sign In:', authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString() : 'Never');
  } else {
    console.log('❌ NOT found in auth.users table');
  }
  console.log('');

  // Check profiles table
  console.log('2️⃣ Checking profiles table...');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email);

  if (profileError) {
    console.error('❌ Error fetching profiles:', profileError.message);
  } else if (profiles && profiles.length > 0) {
    console.log('✅ Found in profiles table:');
    profiles.forEach(profile => {
      console.log('   ID:', profile.id);
      console.log('   Name:', profile.full_name);
      console.log('   Email:', profile.email);
      console.log('   Role:', profile.role);
      console.log('   Created:', new Date(profile.created_at).toLocaleString());
      console.log('');
    });
  } else {
    console.log('❌ NOT found in profiles table');
  }
  console.log('');

  // Summary
  console.log('📊 Summary:');
  if (authUser && profiles && profiles.length > 0) {
    const profile = profiles[0];
    if (authUser.id === profile.id) {
      console.log('✅ User exists in both tables with matching IDs');
      console.log('✅ Password can be changed using ID:', authUser.id);
    } else {
      console.log('⚠️  User exists in both tables but IDs DO NOT MATCH!');
      console.log('   auth.users ID:', authUser.id);
      console.log('   profiles ID:', profile.id);
      console.log('   ⚠️  This is a data integrity issue!');
    }
  } else if (!authUser && profiles && profiles.length > 0) {
    console.log('⚠️  User exists in profiles but NOT in auth.users');
    console.log('   This user cannot log in and password cannot be changed');
    console.log('   Solution: Create auth user or remove profile');
  } else if (authUser && (!profiles || profiles.length === 0)) {
    console.log('⚠️  User exists in auth.users but NOT in profiles');
    console.log('   This user can log in but has no profile data');
    console.log('   Solution: Create profile record');
  } else {
    console.log('❌ User not found in any table');
    console.log('   This user does not exist in the system');
  }
}

checkUser().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
