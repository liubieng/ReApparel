const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = envText.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);

const url = urlMatch ? urlMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';
const key = keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';

const client = createClient(url, key);

async function check() {
  const { data, error } = await client.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Users in remote Supabase:');
    console.table(data);
  }
}

check();
