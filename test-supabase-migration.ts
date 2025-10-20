// SIMPLE TEST - Add this to a test page to verify Supabase migration works

import { getSupabaseAdminClient } from '@/lib/serverUtils';

export async function testSupabaseMigration() {
    const supabaseAdmin = await getSupabaseAdminClient();
    
    try {
        console.log('🧪 Testing Supabase migration...');
        
        // Test 1: Check if tables exist
        const { data: plots, error: plotsError } = await supabaseAdmin
            .from('plots')
            .select('count')
            .limit(1);
            
        const { data: wallets, error: walletsError } = await supabaseAdmin
            .from('wallets')
            .select('count')
            .limit(1);
            
        const { data: brokers, error: brokersError } = await supabaseAdmin
            .from('profiles')
            .select('count')
            .eq('role', 'broker')
            .limit(1);
        
        console.log('✅ Migration Test Results:');
        console.log('- Plots table:', plotsError ? 'FAILED' : 'EXISTS');
        console.log('- Wallets table:', walletsError ? 'FAILED' : 'EXISTS'); 
        console.log('- Brokers count:', brokersError ? 'FAILED' : 'EXISTS');
        
        if (!plotsError && !walletsError && !brokersError) {
            console.log('🎉 Migration successful! All tables ready.');
            return true;
        } else {
            console.log('❌ Migration incomplete. Check SQL script.');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Migration test failed:', error);
        return false;
    }
}

// Call this function in your admin dashboard to test
// testSupabaseMigration();