const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = envText.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);

const url = urlMatch ? urlMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';
const key = keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';

const client = createClient(url, key);

async function runDiagnostic() {
  const start = Date.now();
  const tables = [
    { name: 'users', role: 'Primary Identity', fkey: 'None (Root)' },
    { name: 'clothing_item', role: 'Garment Catalog', fkey: 'REFERENCES users(user_id)' },
    { name: 'tag', role: 'Taxonomy (12 Cat, 14 Colors)', fkey: 'None (Reference)' },
    { name: 'item_tag', role: 'Tag Association (M:N)', fkey: 'clothing_item + tag' },
    { name: 'bsas_assessment', role: 'BSAS Diagnostic History', fkey: 'REFERENCES users(user_id)' },
    { name: 'daily_clothing_log', role: 'Daily Outfit Logs', fkey: 'REFERENCES users(user_id)' },
    { name: 'daily_log_item', role: 'Outfit Garments (M:N)', fkey: 'daily_clothing_log + clothing_item' },
    { name: 'friend_request', role: 'Social Graph Requests', fkey: 'sender_id + receiver_id' },
    { name: 'borrow', role: 'P2P Borrow Transactions', fkey: 'borrower_id + item_id' },
    { name: 'donation_opportunity', role: 'Live Hubs (Non-Seeded)', fkey: 'None' },
    { name: 'donation_flag', role: 'Community Flags', fkey: 'donation_id + user_id' }
  ];

  const results = [];
  let reachable = true;

  for (const t of tables) {
    try {
      const { data, error, count } = await client.from(t.name).select('*', { count: 'exact' });
      if (error) {
        results.push({
          table: t.name,
          role: t.role,
          fkey: t.fkey,
          status: 'error',
          error: error.message,
          code: error.code,
          rows: 0
        });
      } else {
        results.push({
          table: t.name,
          role: t.role,
          fkey: t.fkey,
          status: 'ok',
          rows: count ?? (data ? data.length : 0)
        });
      }
    } catch (e) {
      reachable = false;
      results.push({
        table: t.name,
        role: t.role,
        fkey: t.fkey,
        status: 'network_error',
        error: e.message,
        rows: 0
      });
    }
  }

  // Test write permission on clothing_item
  let writeStatus = 'unknown';
  let writeMessage = '';
  try {
    const { data, error } = await client.from('clothing_item').insert([{
      user_id: 'a0000000-0000-0000-0000-000000000001',
      name: '__probe_test__',
      image_url: 'none',
      addition_type: 'Old'
    }]).select();

    if (error) {
      writeStatus = error.code === '42501' ? 'rls_blocked' : 'error';
      writeMessage = error.message;
    } else {
      writeStatus = 'allowed';
      writeMessage = 'Writable';
      if (data && data[0]?.item_id) {
        await client.from('clothing_item').delete().eq('item_id', data[0].item_id);
      }
    }
  } catch (err) {
    writeStatus = 'error';
    writeMessage = err.message;
  }

  const latency = Date.now() - start;

  console.log('Diagnostic result:');
  console.log('Reachable:', reachable, `(${latency}ms)`);
  console.log('Write Permission Status:', writeStatus, '-', writeMessage);
  console.table(results);
}

runDiagnostic();
