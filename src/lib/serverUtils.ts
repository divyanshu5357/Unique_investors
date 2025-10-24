import { PlotSchema, Wallet } from './schema';
import { cookies } from 'next/headers';
import { createServerClient as createAdminClient } from '@supabase/ssr';
import { z } from 'zod';
import { Broker, DownlineTreeData, withdrawalSchema } from './types';

// This function creates a new Supabase admin client instance on-demand.
export const getSupabaseAdminClient = async () => {
    const cookieStore = cookies();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    }
    
    if (!serviceRoleKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Please add your Supabase Service Role Key to .env.local');
    }
    
    return createAdminClient(
        supabaseUrl, 
        serviceRoleKey, 
    {
        cookies: {
            async get(name: string) {
                return (await cookieStore).get(name)?.value;
            },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};

export async function getAuthenticatedUser(requiredRole?: 'admin' | 'broker') {
    const supabase = await getSupabaseAdminClient();
    // Use getUser() which validates the user server-side with the Auth service
    // (safer than trusting session data read from cookies).
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        throw new Error("Not authenticated");
    }

    const { data: profile, error } = await supabase
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
    const supabaseAdmin = await getSupabaseAdminClient();
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

    function buildTree(brokerId: string): DownlineTreeData | null {
        const profile = profilesMap.get(brokerId);
        if (!profile) return null;

        const children = (childrenMap.get(brokerId) || []).map(p => buildTree(p.id)).filter(Boolean) as DownlineTreeData[];
        return {
            id: profile.id,
            full_name: profile.full_name,
            children: children,
        };
    }

    return buildTree(startBrokerId);
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