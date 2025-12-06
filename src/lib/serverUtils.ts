import { PlotSchema, Wallet } from './schema';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { Broker, DownlineTreeData, withdrawalSchema } from './types';

// This function creates a new Supabase admin client instance with service role key
// that bypasses RLS policies for admin operations
export const getSupabaseAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    }
    
    if (!serviceRoleKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Please add your Supabase Service Role Key to .env.local');
    }
    
    // Use createClient for service role - it properly bypasses RLS
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};

// This function creates a server client for user-authenticated operations
export const getSupabaseServerClient = async () => {
    const cookieStore = cookies();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !anonKey) {
        throw new Error('Missing Supabase environment variables');
    }
    
    return createServerClient(
        supabaseUrl, 
        anonKey, 
    {
        cookies: {
            async get(name: string) {
                return (await cookieStore).get(name)?.value;
            },
            async set(name: string, value: string, options: any) {
                try {
                    (await cookieStore).set(name, value, options);
                } catch (error) {
                    // Handle cookie setting errors gracefully
                    console.error(`Failed to set cookie ${name}:`, error);
                }
            },
            async remove(name: string, options: any) {
                try {
                    (await cookieStore).delete(name);
                } catch (error) {
                    // Handle cookie deletion errors gracefully
                    console.error(`Failed to delete cookie ${name}:`, error);
                }
            },
        },
    });
};


export async function getAuthenticatedUser(requiredRole?: 'admin' | 'broker') {
    // Use server client for auth checks (respects user session from cookies)
    const supabaseServer = await getSupabaseServerClient();
    
    // Validate the user server-side with the Auth service
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser();

    if (userError || !user) {
        throw new Error("Not authenticated");
    }

    // Use admin client only for data queries (bypasses RLS when needed)
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (error || !profile) {
        throw new Error("User profile not found.");
    }

    if (requiredRole && profile.role !== requiredRole) {
         throw new Error(`Unauthorized: Only ${requiredRole}s can perform this action.`);
    }

    if (profile.role !== 'admin' && profile.role !== 'broker') {
        throw new Error("Unauthorized: User does not have a valid role.");
    }

    return { user, role: profile.role };
}

export async function authorizeAdmin() {
    await getAuthenticatedUser('admin');
}

export async function buildDownlineTree(startBrokerId: string): Promise<DownlineTreeData | null> {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: allProfiles, error } = await supabaseAdmin.from('profiles').select('id, full_name, sponsorid');
    if (error) throw new Error("Could not fetch profiles for downline tree.");

    const profilesMap = new Map(allProfiles.map(p => [p.id, p]));
    const childrenMap = new Map<string, any[]>();

    allProfiles.forEach(p => {
        if (p.sponsorid) {
            if (!childrenMap.has(p.sponsorid)) childrenMap.set(p.sponsorid, []);
            childrenMap.get(p.sponsorid)!.push(p);
        }
    });

    /**
     * Builds tree recursively with depth restriction.
     * Only includes nodes up to depth 2 (3 levels total including root):
     * - Depth 0: The logged-in broker (root, self) - commission not applicable
     * - Depth 1: Direct downline (generates Level 1 commission = 2% for root)
     * - Depth 2: Level 1's downline (generates Level 2 commission = 0.5% for root)
     * 
     * Depth 3 and beyond are excluded because they would generate Level 3 commission (0%).
     * 
     * Example: vikas (depth 0) → anup (depth 1) → shubham (depth 2) → vijay (depth 3, hidden)
     */
    function buildTree(brokerId: string, depth: number = 0): DownlineTreeData | null {
        const profile = profilesMap.get(brokerId);
        if (!profile) return null;

        // Include children only if current depth is less than 2
        // This gives us depths: 0 (root), 1 (direct), 2 (level 1), stopping before depth 3 (level 2, 0% commission)
        const children = depth < 2 
            ? (childrenMap.get(brokerId) || []).map(p => buildTree(p.id, depth + 1)).filter(Boolean) as DownlineTreeData[]
            : [];

        return {
            id: profile.id,
            full_name: profile.full_name,
            children: children,
        };
    }

    return buildTree(startBrokerId, 0);
}

/**
 * Validates that an auth user exists before profile operations
 * @param userId - The user ID to validate
 * @param operation - Description of the operation being performed (for error messages)
 * @returns true if auth user exists
 * @throws Error if auth user doesn't exist
 */
export async function validateAuthUserExists(userId: string, operation: string = 'operation'): Promise<boolean> {
    const supabaseAdmin = getSupabaseAdminClient();
    
    try {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (error || !data.user) {
            throw new Error(
                `Cannot perform ${operation}: Auth user with ID ${userId} does not exist. ` +
                `Please ensure the user exists in auth.users table before creating profile.`
            );
        }
        
        return true;
    } catch (error) {
        console.error(`Auth validation failed for ${operation}:`, error);
        throw error;
    }
}

/**
 * Checks for orphaned profiles (profiles without auth users)
 * @returns Array of orphaned profile objects
 */
export async function findOrphanedProfiles(): Promise<Array<{id: string, email: string, full_name: string}>> {
    const supabaseAdmin = getSupabaseAdminClient();
    
    // Get all profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name');
    
    if (profileError || !profiles) {
        throw new Error(`Failed to fetch profiles: ${profileError?.message}`);
    }
    
    // Get all auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
        throw new Error(`Failed to fetch auth users: ${authError.message}`);
    }
    
    // Find profiles without auth users
    const authUserIds = new Set(authData.users.map(u => u.id));
    const orphaned = profiles.filter(p => !authUserIds.has(p.id));
    
    return orphaned;
}

/**
 * Creates auth user for an existing orphaned profile
 * @param profileId - The profile ID
 * @param email - User email
 * @param password - Temporary password
 * @returns Created auth user data
 */
export async function createAuthForProfile(
    profileId: string, 
    email: string, 
    password: string
): Promise<{success: boolean, userId: string}> {
    const supabaseAdmin = getSupabaseAdminClient();
    
    // Verify profile exists
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
    
    if (profileError || !profile) {
        throw new Error(`Profile not found with ID: ${profileId}`);
    }
    
    // Check if auth user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(profileId);
    if (existingUser?.user) {
        throw new Error(`Auth user already exists for this profile`);
    }
    
    // Create auth user with the profile ID
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        id: profileId,
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
            full_name: profile.full_name,
            role: profile.role
        }
    });
    
    if (authError || !authData.user) {
        throw new Error(`Failed to create auth user: ${authError?.message}`);
    }
    
    return {
        success: true,
        userId: authData.user.id
    };
}

export const BrokerFormSchema = z.object({
    fullName: z.string().min(1, 'Full name is required.'),
    email: z.string().email('Invalid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    uplineId: z.string().optional().nullable(),
});

export const manageWalletSchema = z.object({
    brokerId: z.string(),
    type: z.enum(['credit', 'debit']),
    amount: z.number().positive(),
    walletType: z.enum(['direct', 'downline']),
    description: z.string(),
    paymentMode: z.string().optional(),
    transactionId: z.string().optional(),
});

export interface BulkAddPlotsData {
    projectName: string;
    type: string;
    block: string;
    totalPlots: number;
    dimension: string;
    area: number;
    startingPlotNumber?: number;
    facing?: string;
}