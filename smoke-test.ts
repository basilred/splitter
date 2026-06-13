import { randomUUID } from 'crypto';

const BASE_URL = 'http://localhost:3000/api';

async function smokeTest() {
  console.log('🚀 Starting smoke test...\n');

  // 1. Health check
  console.log('1. Health check');
  const healthRes = await fetch(`${BASE_URL}/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed: ${healthRes.status}`);
  }
  console.log('   ✅ Health check passed\n');

  // 2. Create venue
  console.log('2. Create venue');
  const venueId = randomUUID();
  const venueRes = await fetch(`${BASE_URL}/venues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Smoke Test Venue',
      currency: 'RUB',
      tipPresets: [0, 5, 10, 15],
    }),
  });
  if (!venueRes.ok) {
    const text = await venueRes.text();
    throw new Error(`Create venue failed: ${venueRes.status} ${text}`);
  }
  const venue = await venueRes.json();
  console.log(`   ✅ Venue created: ${venue.id}\n`);

  // 3. Create table
  console.log('3. Create table');
  const tableRes = await fetch(`${BASE_URL}/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venueId: venue.id,
      label: 'Table 99',
    }),
  });
  if (!tableRes.ok) {
    const text = await tableRes.text();
    throw new Error(`Create table failed: ${tableRes.status} ${text}`);
  }
  const table = await tableRes.json();
  console.log(`   ✅ Table created: ${table.id} (token: ${table.tableToken})\n`);

  // 4. Create bill
  console.log('4. Create bill');
  const billRes = await fetch(`${BASE_URL}/bills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venueId: venue.id,
      tableId: table.id,
    }),
  });
  if (!billRes.ok) {
    const text = await billRes.text();
    throw new Error(`Create bill failed: ${billRes.status} ${text}`);
  }
  const bill = await billRes.json();
  console.log(`   ✅ Bill created: ${bill.id}\n`);

  // 5. Get bill with items (should be empty)
  console.log('5. Get bill with items');
  const billGetRes = await fetch(`${BASE_URL}/bills?tableId=${table.id}`);
  if (!billGetRes.ok) {
    const text = await billGetRes.text();
    throw new Error(`Get bill failed: ${billGetRes.status} ${text}`);
  }
  const billData = await billGetRes.json();
  console.log(`   ✅ Bill retrieved, status: ${billData.bill?.bill?.status}\n`);

  // 6. List tables for venue
  console.log('6. List tables for venue');
  const tablesRes = await fetch(`${BASE_URL}/tables?venueId=${venue.id}`);
  if (!tablesRes.ok) {
    const text = await tablesRes.text();
    throw new Error(`List tables failed: ${tablesRes.status} ${text}`);
  }
  const tablesData = await tablesRes.json();
  console.log(`   ✅ Tables count: ${tablesData.tables?.length || 0}\n`);

  // 7. Get table by token (public endpoint)
  console.log('7. Get table by token');
  const tableByTokenRes = await fetch(`${BASE_URL}/tables/${table.tableToken}`);
  if (!tableByTokenRes.ok) {
    const text = await tableByTokenRes.text();
    throw new Error(`Get table by token failed: ${tableByTokenRes.status} ${text}`);
  }
  const tableByToken = await tableByTokenRes.json();
  console.log(`   ✅ Table retrieved: ${tableByToken.table?.label}\n`);

  // 8. Clean up (optional) - we can skip deletion for smoke test

  console.log('🎉 Smoke test completed successfully!');
  console.log('\nSummary:');
  console.log(`   Venue: ${venue.id}`);
  console.log(`   Table: ${table.id} (${table.tableToken})`);
  console.log(`   Bill: ${bill.id}`);
  console.log('\nAll endpoints are operational.');
}

smokeTest().catch((error) => {
  console.error('❌ Smoke test failed:', error.message);
  process.exit(1);
});