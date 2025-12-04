require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Checking credentials...');
console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Key:', supabaseKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing connection...');
    // Try to select from a table we know exists or just check health
    const { data, error } = await supabase.from('configuracion').select('*').limit(1);

    if (error) {
        console.error('Connection failed:', error.message);
        console.error('Full error:', error);
    } else {
        console.log('Connection successful!');
        console.log('Data received:', data);
    }
}

testConnection();
