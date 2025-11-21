import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) return res.status(400).json({ error: 'Missing userId or newPassword' });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRole) {
      return res.status(500).json({ error: 'Supabase admin credentials not set' });
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First, verify the user exists in auth.users
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(404).json({ 
        error: `User not found in auth.users table`, 
        details: userError.message,
        userId 
      });
    }
    if (!userData.user) {
      console.error('User data is null for userId:', userId);
      return res.status(404).json({ 
        error: `User with ID ${userId} does not exist in authentication system`,
        userId 
      });
    }

    // Update the password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) {
      console.error('Error updating password:', error);
      return res.status(400).json({ error: error.message, details: error });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: `Password updated successfully for ${userData.user.email}` 
    });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error', stack: err.stack });
  }
}
