/**
 * Interactive script to fix orphaned profiles
 * Run with: node scripts/fix-orphaned-profiles.js
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function fixOrphanedProfiles() {
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

  console.log('🔍 Scanning for orphaned profiles...\n');

  // Get all profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*');

  if (profileError) {
    console.error('❌ Error fetching profiles:', profileError.message);
    process.exit(1);
  }

  // Get all auth users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('❌ Error fetching auth users:', authError.message);
    process.exit(1);
  }

  // Find orphaned profiles
  const authUserIds = new Set(authUsers.users.map(u => u.id));
  const orphanedProfiles = profiles.filter(p => !authUserIds.has(p.id));

  if (orphanedProfiles.length === 0) {
    console.log('✅ No orphaned profiles found! Your database is clean.\n');
    rl.close();
    return;
  }

  console.log(`⚠️  Found ${orphanedProfiles.length} orphaned profile(s):\n`);

  orphanedProfiles.forEach((profile, index) => {
    console.log(`${index + 1}. ${profile.full_name || 'No name'} (${profile.email})`);
    console.log(`   ID: ${profile.id}`);
    console.log(`   Role: ${profile.role}`);
    console.log('');
  });

  console.log('How would you like to fix these orphaned profiles?\n');
  console.log('1. Create auth users for all (with auto-generated passwords)');
  console.log('2. Create auth users interactively (set password for each)');
  console.log('3. Delete orphaned profiles (CAUTION: Cannot be undone!)');
  console.log('4. Exit without changes\n');

  const choice = await question('Enter your choice (1-4): ');

  if (choice === '1') {
    // Auto-generate passwords
    console.log('\n🔧 Creating auth users with auto-generated passwords...\n');
    const defaultPassword = await question('Enter default password for all users (min 6 chars): ');
    
    if (defaultPassword.length < 6) {
      console.log('❌ Password must be at least 6 characters');
      rl.close();
      return;
    }

    for (const profile of orphanedProfiles) {
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          id: profile.id,
          email: profile.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            full_name: profile.full_name,
            role: profile.role
          }
        });

        if (error) {
          console.log(`❌ Failed to create auth user for ${profile.email}: ${error.message}`);
        } else {
          console.log(`✅ Created auth user for ${profile.email}`);
        }
      } catch (err) {
        console.log(`❌ Error creating auth user for ${profile.email}:`, err.message);
      }
    }

    console.log('\n✅ Batch creation complete!');
    console.log(`\n⚠️  All users have the same password: "${defaultPassword}"`);
    console.log('Please change passwords through the admin panel.\n');

  } else if (choice === '2') {
    // Interactive password setting
    console.log('\n🔧 Creating auth users interactively...\n');

    for (const profile of orphanedProfiles) {
      console.log(`\nProcessing: ${profile.full_name} (${profile.email})`);
      const password = await question('Enter password (or "skip" to skip this user): ');

      if (password.toLowerCase() === 'skip') {
        console.log('⏭️  Skipped');
        continue;
      }

      if (password.length < 6) {
        console.log('❌ Password too short, skipping...');
        continue;
      }

      try {
        const { data, error } = await supabase.auth.admin.createUser({
          id: profile.id,
          email: profile.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: profile.full_name,
            role: profile.role
          }
        });

        if (error) {
          console.log(`❌ Failed: ${error.message}`);
        } else {
          console.log(`✅ Created successfully`);
        }
      } catch (err) {
        console.log(`❌ Error:`, err.message);
      }
    }

    console.log('\n✅ Interactive creation complete!\n');

  } else if (choice === '3') {
    // Delete orphaned profiles
    console.log('\n⚠️  WARNING: This will PERMANENTLY DELETE orphaned profiles!');
    console.log('This action cannot be undone.\n');
    
    const confirm = await question('Type "DELETE" to confirm deletion: ');

    if (confirm !== 'DELETE') {
      console.log('❌ Deletion cancelled\n');
      rl.close();
      return;
    }

    console.log('\n🗑️  Deleting orphaned profiles...\n');

    for (const profile of orphanedProfiles) {
      try {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', profile.id);

        if (error) {
          console.log(`❌ Failed to delete ${profile.email}: ${error.message}`);
        } else {
          console.log(`✅ Deleted profile: ${profile.email}`);
        }
      } catch (err) {
        console.log(`❌ Error deleting ${profile.email}:`, err.message);
      }
    }

    console.log('\n✅ Deletion complete!\n');

  } else {
    console.log('\n👋 No changes made. Exiting...\n');
  }

  rl.close();
}

fixOrphanedProfiles().catch(err => {
  console.error('❌ Fatal error:', err);
  rl.close();
  process.exit(1);
});
