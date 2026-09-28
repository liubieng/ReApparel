import { mockDatabase } from '../src/services/supabaseClient';

console.log('Testing duplicate email registration...');

try {
  // Test 1: Try registering Mario's email (already exists)
  mockDatabase.registerUser({
    email: 'mario@example.com',
    first_name: 'Imposter',
    last_name: 'Mario'
  });
  console.error('FAIL: Should have rejected registration of mario@example.com');
  process.exit(1);
} catch (err: any) {
  console.log('PASS: Successfully rejected duplicate registration:', err.message);
}

try {
  // Test 2: Register a fresh unique user
  const email = `test.unique.${Date.now()}@example.com`;
  const user1 = mockDatabase.registerUser({
    email,
    first_name: 'First',
    last_name: 'User'
  });
  console.log('PASS: Successfully registered first user:', user1.email, user1.user_id);

  // Test 3: Try registering the exact same email again
  mockDatabase.registerUser({
    email,
    first_name: 'Duplicate',
    last_name: 'User'
  });
  console.error('FAIL: Should have rejected registration of', email);
  process.exit(1);
} catch (err) {
  console.log('PASS: Successfully rejected duplicate registration of same user:', err.message);
}

console.log('\nAll duplicate email tests passed!');
