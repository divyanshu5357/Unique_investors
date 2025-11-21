/**
 * Script to create auth user for existing profile
 * Run with: node scripts/create-auth-for-profile.js <email> <password>
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/create-auth-for-profile.js <email> <password>');
  console.error('Example: node scripts/create-auth-for-profile.js vikas@broker.com newPassword123');
  process.exit(1);
}

async function createAuthUser() {
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

  console.log('🔍 Step 1: Checking if profile exists...');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email);

  if (profileError) {
    console.error('❌ Error fetching profile:', profileError.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.error('❌ Profile not found for email:', email);
    process.exit(1);
  }

  const profile = profiles[0];
  console.log('✅ Profile found:');
  console.log('   ID:', profile.id);
  console.log('   Name:', profile.full_name);
  console.log('   Role:', profile.role);
  console.log('');

  console.log('🔍 Step 2: Checking if auth user exists...');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('❌ Error fetching auth users:', authError.message);
    process.exit(1);
  }

  const existingAuthUser = authUsers.users.find(u => u.email === email);
  if (existingAuthUser) {
    console.log('ℹ️  Auth user already exists with ID:', existingAuthUser.id);
    if (existingAuthUser.id === profile.id) {
      console.log('✅ IDs match! No action needed.');
      console.log('');
      console.log('💡 If you want to change the password, use the Change Password dialog in the admin panel.');
    } else {
      console.log('⚠️  WARNING: Auth user ID does not match profile ID!');
      console.log('   Auth ID:', existingAuthUser.id);
      console.log('   Profile ID:', profile.id);
      console.log('   This is a data integrity issue that needs manual resolution.');
    }
    process.exit(0);
  }

  console.log('✅ Auth user does not exist. Creating...');
  console.log('');

  console.log('🔧 Step 3: Creating auth user with profile ID...');
  console.log('   Email:', email);
  console.log('   User ID (from profile):', profile.id);
  console.log('');

  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    id: profile.id, // Use the existing profile ID
    email: email,
    password: password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: profile.full_name,
      role: profile.role
    }
  });

  if (createError) {
    console.error('❌ Error creating auth user:', createError.message);
    process.exit(1);
  }

  console.log('✅ Auth user created successfully!');
  console.log('   ID:', newUser.user.id);
  console.log('   Email:', newUser.user.email);
  console.log('   Email Confirmed:', newUser.user.email_confirmed_at ? 'Yes' : 'No');
  console.log('');
  console.log('✅ User can now log in with:');
  console.log('   Email:', email);
  console.log('   Password: [the password you provided]');
  console.log('');
  console.log('💡 The password can be changed through the admin panel.');
}

createAuthUser().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
