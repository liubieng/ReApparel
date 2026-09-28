const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = envText.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);

const url = urlMatch ? urlMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';
const key = keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';

console.log('Testing Supabase connection...');
console.log('URL:', url);

const client = createClient(url, key);

async function testAll() {
  const tables = [
    'users',
    'tag',
    'clothing_item',
    'item_tag',
    'bsas_assessment',
    'daily_clothing_log',
    'daily_log_item',
    'friend_request',
    'borrow',
    'donation_opportunity',
    'donation_flag'
  ];

  for (const t of tables) {
    const { data, error, count } = await client.from(t).select('*', { count: 'exact' });
    if (error) {
      console.log(`Table [${t}]: SELECT ERROR -> code: ${error.code} | message: ${error.message}`);
    } else {
      console.log(`Table [${t}]: SELECT OK -> rows: ${data ? data.length : 0}, count: ${count}`);
    }
  }

  // Now test an insert into clothing_item
  console.log('\n--- Testing test INSERT into clothing_item ---');
  const testUserId = 'a0000000-0000-0000-0000-000000000001';
  const insertRes = await client.from('clothing_item').insert([{
    user_id: testUserId,
    name: 'Diagnostic Connection Test Shirt',
    image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop',
    addition_type: 'Old',
    wear_count: 0
  }]).select();

  if (insertRes.error) {
    console.log(`INSERT clothing_item: ERROR -> code: ${insertRes.error.code} | message: ${insertRes.error.message}`);
    console.log('Details:', insertRes.error.details, 'Hint:', insertRes.error.hint);
  } else {
    console.log(`INSERT clothing_item: SUCCESS -> created item:`, insertRes.data);
    // clean it up
    if (insertRes.data && insertRes.data[0]?.item_id) {
      await client.from('clothing_item').delete().eq('item_id', insertRes.data[0].item_id);
      console.log('Cleaned up test item.');
    }
  }

  // Now test an insert into bsas_assessment
  console.log('\n--- Testing test INSERT into bsas_assessment ---');
  const bsasRes = await client.from('bsas_assessment').insert([{
    user_id: testUserId,
    score: 3,
    risk_level: 'Non-Indicative'
  }]).select();

  if (bsasRes.error) {
    console.log(`INSERT bsas_assessment: ERROR -> code: ${bsasRes.error.code} | message: ${bsasRes.error.message}`);
    console.log('Details:', bsasRes.error.details, 'Hint:', bsasRes.error.hint);
  } else {
    console.log(`INSERT bsas_assessment: SUCCESS -> created assessment:`, bsasRes.data);
    if (bsasRes.data && bsasRes.data[0]?.assessment_id) {
      await client.from('bsas_assessment').delete().eq('assessment_id', bsasRes.data[0].assessment_id);
      console.log('Cleaned up test assessment.');
    }
  }
}

testAll().then(() => console.log('\nAudit complete.'));
