/**
 * Automated API Test Suite
 * Tests Authentication (JWT Register/Login), CRUD operations, Validation, and Ownership Authorization.
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

  let authToken = null;
  let testUser = null;
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
    // TEST 2: Authentication - Register New Account
    // ----------------------------------------------------
    console.log('\n--- Suite 2: Authentication - Register ---');
    const testUsername = 'teststudent_' + Date.now().toString(36);
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student User',
        username: testUsername,
        password: 'password123'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Registers new student account with HTTP 201');
    assert(regData.success === true, 'Returns success: true on register');
    assert(typeof regData.token === 'string', 'Returns JWT authentication token');
    assert(regData.user.username === testUsername, 'Returns created username');

    // Reject duplicate username
    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Test',
        username: testUsername,
        password: 'password123'
      })
    });
    assert(dupRes.status === 400, 'Rejects duplicate registration with HTTP 400');

    // ----------------------------------------------------
    // TEST 3: Authentication - Sign In (Login)
    // ----------------------------------------------------
    console.log('\n--- Suite 3: Authentication - Login & Token Verification ---');
    // Wrong password test
    const wrongPassRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: 'wrong_password_xyz'
      })
    });
    assert(wrongPassRes.status === 401, 'Rejects incorrect password with HTTP 401');

    // Valid login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Logs in successfully with HTTP 200');
    assert(typeof loginData.token === 'string', 'Returns valid JWT token');
    authToken = loginData.token;
    testUser = loginData.user;

    // Verify /api/auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'Verified profile via /api/auth/me');
    assert(meData.user.username === testUsername, 'Profile matches authenticated user');

    // ----------------------------------------------------
    // TEST 4: Authorization Protection - Unauthenticated Rejection
    // ----------------------------------------------------
    console.log('\n--- Suite 4: Route Protection ---');
    const unauthRes = await fetch(`${baseUrl}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauthorized Post' })
    });
    assert(unauthRes.status === 401, 'Rejects unauthenticated POST request with HTTP 401');

    // ----------------------------------------------------
    // TEST 5: Validation - Reject Invalid / Empty Fields
    // ----------------------------------------------------
    console.log('\n--- Suite 5: Input Validation & Edge Cases ---');
    const invalidRes = await fetch(`${baseUrl}/api/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
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
    // TEST 6: CRUD - CREATE (Post New Lost Item)
    // ----------------------------------------------------
    console.log('\n--- Suite 6: CRUD Operation - CREATE ---');
    const createRes = await fetch(`${baseUrl}/api/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: 'Blue Campus Backpack (Dell)',
        description: 'Navy blue canvas backpack with laptop charger inside',
        post_type: 'Lost',
        category: 'Accessories',
        location: 'Engineering Block 3, Room 302',
        contact_info: 'teststudent@campus.edu',
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
    // TEST 7: CRUD - READ (List Items & Get by ID)
    // ----------------------------------------------------
    console.log('\n--- Suite 7: CRUD Operation - READ ---');
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
    // TEST 8: CRUD - UPDATE (Edit Details & Status)
    // ----------------------------------------------------
    console.log('\n--- Suite 8: CRUD Operation - UPDATE ---');
    const updateRes = await fetch(`${baseUrl}/api/items/${createdItemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
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
    // TEST 9: Dashboard Statistics
    // ----------------------------------------------------
    console.log('\n--- Suite 9: Analytics & Stats ---');
    const statsRes = await fetch(`${baseUrl}/api/items/stats`);
    const statsData = await statsRes.json();
    assert(statsRes.status === 200, 'Stats endpoint responds with HTTP 200');
    assert(typeof statsData.data.total === 'number' && statsData.data.total > 0, 'Stats includes total count');
    assert(typeof statsData.data.claimed === 'number', 'Stats includes claimed count');

    // ----------------------------------------------------
    // TEST 10: Ownership Protection - Reject Other Users
    // ----------------------------------------------------
    console.log('\n--- Suite 10: Ownership Protection ---');
    // Register second student
    const otherUsername = 'otherstudent_' + Date.now().toString(36);
    const otherRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Other Student',
        username: otherUsername,
        password: 'password123'
      })
    });
    const otherRegData = await otherRegRes.json();
    const otherToken = otherRegData.token;

    // Other user attempts to delete testUser's item
    const unauthorizedDelete = await fetch(`${baseUrl}/api/items/${createdItemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${otherToken}` }
    });
    assert(unauthorizedDelete.status === 403, 'Rejects deletion of other user\'s post with HTTP 403 Forbidden');

    // ----------------------------------------------------
    // TEST 11: CRUD - DELETE by Owner
    // ----------------------------------------------------
    console.log('\n--- Suite 11: CRUD Operation - DELETE by Owner ---');
    const deleteRes = await fetch(`${baseUrl}/api/items/${createdItemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const deleteData = await deleteRes.json();
    assert(deleteRes.status === 200, 'Owner deletes item with HTTP 200');
    assert(deleteData.success === true, 'Returns success: true on delete');

    // Verify item is actually deleted (404 expected)
    const verifyDeleteRes = await fetch(`${baseUrl}/api/items/${createdItemId}`);
    assert(verifyDeleteRes.status === 404, 'Deleted item no longer exists (returns HTTP 404)');

    // ----------------------------------------------------
    // TEST 12: Error Handling - 404 for Non-Existent Resources
    // ----------------------------------------------------
    console.log('\n--- Suite 12: 404 Error Handling ---');
    const notFoundRes = await fetch(`${baseUrl}/api/items/non-existent-random-id-9999`);
    assert(notFoundRes.status === 404, 'Returns 404 for non-existent item ID');

    // ----------------------------------------------------
    // TEST 13: Image Upload Handling
    // ----------------------------------------------------
    console.log('\n--- Suite 13: Image Upload Validation ---');
    const emptyUploadRes = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST'
    });
    assert(emptyUploadRes.status === 400, 'Upload rejects empty file submission with HTTP 400');
    const emptyUploadData = await emptyUploadRes.json();
    assert(emptyUploadData.success === false, 'Upload reports failure for empty request');

    // ----------------------------------------------------
    // TEST 14: Audit Trail Logging & Verification
    // ----------------------------------------------------
    console.log('\n--- Suite 14: Audit Trail Logging & Access Control ---');
    // Unauthenticated rejection
    const unauthAuditRes = await fetch(`${baseUrl}/api/audit-logs`);
    assert(unauthAuditRes.status === 401, 'Rejects unauthenticated access to audit logs with HTTP 401');

    // Authenticated retrieval
    const authAuditRes = await fetch(`${baseUrl}/api/audit-logs`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const authAuditData = await authAuditRes.json();
    assert(authAuditRes.status === 200, 'Authenticated user retrieves audit logs with HTTP 200');
    assert(authAuditData.success === true, 'Audit log response contains success: true');
    assert(Array.isArray(authAuditData.data), 'Audit logs returned in an array');
    assert(authAuditData.data.some(l => l.action === 'AUTH_LOGIN'), 'Audit trail recorded student login event');
    assert(authAuditData.data.some(l => l.action === 'ACCESS_DENIED'), 'Audit trail recorded unauthorized access denial event');

    // ----------------------------------------------------
    // TEST 15: Claim Verification Flow & Privacy Protection
    // ----------------------------------------------------
    console.log('\n--- Suite 15: Claim Verification Flow & Privacy ---');
    // Create a new item to claim
    const itemToClaimRes = await fetch(`${baseUrl}/api/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: 'Casio FX-991EX Calculator',
        description: 'Black scientific calculator left in Lecture Theatre 1',
        post_type: 'Found',
        category: 'Electronics',
        location: 'Lecture Theatre 1',
        contact_info: 'finder@nileuniversity.edu.ng',
        status: 'Open'
      })
    });
    const itemToClaimData = await itemToClaimRes.json();
    const claimTargetId = itemToClaimData.data._id || itemToClaimData.data.id;

    // Submit a claim with verification answer from other user
    const submitClaimRes = await fetch(`${baseUrl}/api/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${otherToken}`
      },
      body: JSON.stringify({
        item_id: claimTargetId,
        verification_answer: 'My name initials are scratched on the back cover',
        claimant_contact: 'other@nileuniversity.edu.ng'
      })
    });
    const submitClaimData = await submitClaimRes.json();
    assert(submitClaimRes.status === 201, 'Submits claim with secret verification answer (HTTP 201)');
    assert(submitClaimData.success === true, 'Claim response contains success: true');
    const claimId = submitClaimData.data.id;

    // Owner views received claims on their item
    const getClaimsRes = await fetch(`${baseUrl}/api/claims/item/${claimTargetId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const getClaimsData = await getClaimsRes.json();
    assert(getClaimsRes.status === 200, 'Post owner can view claims on their item with HTTP 200');
    assert(getClaimsData.data.some(c => c.id === claimId), 'Claim is present in received claims');

    // Approve the claim
    const approveRes = await fetch(`${baseUrl}/api/claims/${claimId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status: 'Approved' })
    });
    const approveData = await approveRes.json();
    assert(approveRes.status === 200, 'Owner approves claim with HTTP 200');
    assert(approveData.data.status === 'Approved', 'Claim status updated to Approved');

    // ----------------------------------------------------
    // TEST 16: Smart Matching Engine
    // ----------------------------------------------------
    console.log('\n--- Suite 16: Smart Matching Engine ---');
    const matchRes = await fetch(`${baseUrl}/api/items/${claimTargetId}/matches`);
    const matchData = await matchRes.json();
    assert(matchRes.status === 200, 'Match endpoint responds with HTTP 200');
    assert(matchData.success === true, 'Smart matcher returns success: true');
    assert(Array.isArray(matchData.data), 'Returns matches array with similarity scores');

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
