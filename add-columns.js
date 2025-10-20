const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addMissingColumns() {
    const alterCommands = [
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS type VARCHAR",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS block VARCHAR", 
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS dimension VARCHAR",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS broker_name VARCHAR",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS broker_id UUID",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS seller_name VARCHAR",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS sold_amount NUMERIC",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS commission_rate NUMERIC"
    ];
    
    console.log('🔧 Adding missing columns to plots table...');
    
    for (const command of alterCommands) {
        try {
            const { error } = await supabase.rpc('exec_sql', { sql: command });
            if (error) {
                console.log(`⚠️  ${command} - ${error.message}`);
            } else {
                console.log(`✅ ${command}`);
            }
        } catch (err) {
            console.log(`❌ ${command} - ${err.message}`);
        }
    }
    
    // Now check the updated table structure
    console.log('\n📊 Checking updated table structure...');
    const { data, error } = await supabase
        .from('plots')
        .select('*')
        .limit(1);
    
    if (data && data.length > 0) {
        console.log('✅ Updated columns:', Object.keys(data[0]).sort());
    }
}

addMissingColumns();