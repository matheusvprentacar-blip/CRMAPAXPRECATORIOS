
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/"/g, '');
    }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Key:', supabaseKey ? 'Found' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Fetching last 5 modified precatorios...');
    const { data: precatorios, error } = await supabase
        .from('precatorios')
        .select('id, titulo, numero_precatorio, status, status_kanban, responsavel_calculo_id, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.table(precatorios.map(p => ({
            title: (p.titulo || p.numero_precatorio || '').substring(0, 30),
            status: p.status,
            kanban: p.status_kanban,
            updated: new Date(p.updated_at).toLocaleString()
        })));
    }
}

main();
