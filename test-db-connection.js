// Simple test to check Supabase database connection
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? 'Present' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        // Test basic connection
        const { data, error } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('Database connection error:', error);
            return;
        }
        
        console.log('✅ Database connection successful');
        
        // Test plots table structure
        const { data: plotsData, error: plotsError } = await supabase
            .from('plots')
            .select('*')
            .limit(1);
            
        if (plotsError) {
            console.error('❌ Plots table error:', plotsError);
            console.log('This might be the issue - the plots table schema needs to be updated');
        } else {
            console.log('✅ Plots table accessible');
            console.log('Plots table sample structure:', plotsData.length > 0 ? Object.keys(plotsData[0]) : 'No data');
        }
        
    } catch (error) {
        console.error('Connection test failed:', error);
    }
}

testConnection();