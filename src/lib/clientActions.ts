import { createClient } from '@/lib/supabase/client';
import { Broker } from './types';
import { Wallet } from './schema';

export async function getBrokersClient(): Promise<Broker[]> {
    const supabase = createClient();
    
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'broker');

    if (profileError) throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    if (!profiles) return [];


    return profiles.map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        created_at: '',
        soldPlots: [],
        directSaleBalance: 0,
        downlineSaleBalance: 0,
        totalBalance: 0,
    }));
}