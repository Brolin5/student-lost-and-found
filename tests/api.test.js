/**
 * Automated API Test Suite
 * Tests all 4 CRUD operations, validation rules, and error handling.
 */

const http = require('http');
const app = require('../server');

const TEST_PORT = 5098;
let server;
let baseUrl;

// Test counters
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('\n==================================================');
  console.log('   RUNNING STUDENT LOST & FOUND API TEST SUITE    ');
  console.log('==================================================\n');

  server = http.createServer(app);
  await new Promise(resolve => server.listen(TEST_PORT, resolve));
  baseUrl = `http://localhost:${TEST_PORT}`;

  let createdItemId = null;

  try {
    // ----------------------------------------------------
    // TEST 1: Health Check
    // ----------------------------------------------------
    console.log('--- Suite 1: System Health & Initialization ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health check returns status 200');
    assert(healthData.status === 'healthy', 'Health check reports "healthy"');

    // ----------------------------------------------------
    // TEST 2: Validation - Reject Invalid / Empty Input
    // ----------------------------------------------------
    console.log('\n--- Suite 2: Input Validation & Edge Cases ---');
    const invalidRes = await fetch(`${baseUrl}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '',
        description: '',
        post_type: 'InvalidType'
      })
    });
    const invalidData = await invalidRes.json();
    assert(invalidRes.status === 400, 'Rejects empty and invalid fields with HTTP 400');
    assert(invalidData.success === false, 'Returns success: false for invalid input');
    assert(Array.isArray(invalidData.errors) && invalidData.errors.length > 0, 'Returns specific validation error messages');

    // ----------------------------------------------------
    // TEST 3: CRUD - CREATE (Post New Lost Item)
    // ----------------------------------------------------
    console.log('\n--- Suite 3: CRUD Operation - CREATE ---');
    const createRes = await fetch(`${baseUrl}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Blue Campus Backpack (Dell)',
        description: 'Navy blue canvas backpack with laptop charger inside',
        post_type: 'Lost',
        category: 'Accessories',
        location: 'Engineering Block 3, Room 302',
        contact_info: 'emeka.student@campus.edu',
        status: 'Open'
      })
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, 'Creates item with HTTP 201 Created');
    assert(createData.success === true, 'Returns success: true on creation');
    assert(createData.data && (createData.data._id || createData.data.id), 'Returns created item with unique ID');
    assert(createData.data.title === 'Blue Campus Backpack (Dell)', 'Item title matches input');
    assert(createData.data.status === 'Open', 'Initial status defaults to Open');
    createdItemId = createData.data._id || createData.data.id;

    // ----------------------------------------------------
    // TEST 4: CRUD - READ (List Items & Get by ID)
    // ----------------------------------------------------
    console.log('\n--- Suite 4: CRUD Operation - READ ---');
    const listRes = await fetch(`${baseUrl}/api/items`);
    const listData = await listRes.json();
    assert(listRes.status === 200, 'Fetches all items with HTTP 200');
    assert(listData.success === true, 'List response contains success: true');
    assert(Array.isArray(listData.data), 'Returns items in an array');
    assert(listData.data.some(i => (i._id === createdItemId || i.id === createdItemId)), 'Created item is retrieved in items list');

    // Filter by type
    const filterRes = await fetch(`${baseUrl}/api/items?type=Lost`);
    const filterData = await filterRes.json();
    assert(filterRes.status === 200, 'Filtering items by post_type works');
    assert(filterData.data.every(i => i.post_type === 'Lost'), 'All filtered results have post_type === "Lost"');

    // Read single item
    const singleRes = await fetch(`${baseUrl}/api/items/${createdItemId}`);
    const singleData = await singleRes.json();
    assert(singleRes.status === 200, 'Fetches single item by ID with HTTP 200');
    assert(singleData.data.title === 'Blue Campus Backpack (Dell)', 'Retrieved single item matches ID');

    // ----------------------------------------------------
    // TEST 5: CRUD - UPDATE (Edit Details & Status)
    // ----------------------------------------------------
    console.log('\n--- Suite 5: CRUD Operation - UPDATE ---');
    const updateRes = await fetch(`${baseUrl}/api/items/${createdItemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Blue Campus Backpack (Dell) [CLAIMED]',
        status: 'Claimed',
        location: 'Security Post 1 (Handed in)'
      })
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'Updates item with HTTP 200');
    assert(updateData.success === true, 'Returns success: true on update');
    assert(updateData.data.status === 'Claimed', 'Status successfully updated to Claimed');
    assert(updateData.data.location === 'Security Post 1 (Handed in)', 'Location updated properly');

    // ----------------------------------------------------
    // TEST 6: Dashboard Statistics
    // ----------------------------------------------------
    console.log('\n--- Suite 6: Analytics & Stats ---');
    const statsRes = await fetch(`${baseUrl}/api/items/stats`);
    const statsData = await statsRes.json();
    assert(statsRes.status === 200, 'Stats endpoint responds with HTTP 200');
    assert(typeof statsData.data.total === 'number' && statsData.data.total > 0, 'Stats includes total count');
    assert(typeof statsData.data.claimed === 'number', 'Stats includes claimed count');

    // ----------------------------------------------------
    // TEST 7: CRUD - DELETE (Remove Item)
    // ----------------------------------------------------
    console.log('\n--- Suite 7: CRUD Operation - DELETE ---');
    const deleteRes = await fetch(`${baseUrl}/api/items/${createdItemId}`, {
      method: 'DELETE'
    });
    const deleteData = await deleteRes.json();
    assert(deleteRes.status === 200, 'Deletes item with HTTP 200');
    assert(deleteData.success === true, 'Returns success: true on delete');

    // Verify item is actually deleted (404 expected)
    const verifyDeleteRes = await fetch(`${baseUrl}/api/items/${createdItemId}`);
    assert(verifyDeleteRes.status === 404, 'Deleted item no longer exists (returns HTTP 404)');

    // ----------------------------------------------------
    // TEST 8: Error Handling - 404 for Non-Existent Resources
    // ----------------------------------------------------
    console.log('\n--- Suite 8: 404 Error Handling ---');
    const notFoundRes = await fetch(`${baseUrl}/api/items/non-existent-random-id-9999`);
    assert(notFoundRes.status === 404, 'Returns 404 for non-existent item ID');

    console.log('\n==================================================');
    console.log(` ✅ ALL TESTS PASSED: ${passed} passed, ${failed} failed.`);
    console.log('==================================================\n');
  } catch (error) {
    console.error('\n❌ Test run failed with error:', error.message);
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
