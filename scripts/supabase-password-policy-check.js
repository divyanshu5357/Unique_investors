// This script fetches the password policy from Supabase and prints it.

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Polyfill __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'NOT SET');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before running');
  process.exit(1);
}

const supabase = createClient(url, serviceRole);

async function run() {
  try {
    // Try to create a user with a weak password to get the real error
    const { data, error } = await supabase.auth.admin.createUser({
      email: `policytest${Date.now()}@example.com`,
      password: 'test',
      email_confirm: true,
    });
    if (error) {
      console.log('Supabase password policy error:', error.message);
    } else {
      console.log('User created (unexpected, policy is very weak):', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
