
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkLatestPrecatorio() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role to bypass RLS

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing environment variables')
        return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
        .from('precatorios')
        .select('id, numero_precatorio, file_url, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)

    if (error) {
        console.error('Error fetching precatorio:', error)
    } else {
        console.log('Latest Precatorio:', data)
    }
}

checkLatestPrecatorio()
