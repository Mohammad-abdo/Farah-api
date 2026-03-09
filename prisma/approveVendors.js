/**
 * Approve test vendors on any environment via API.
 * Usage:
 *   node prisma/approveVendors.js                               → local
 *   node prisma/approveVendors.js https://farah.developteam.site → production
 */
const BASE = process.argv[2] || 'http://localhost:8001';

const phones = ['96550001111', '96550002222', '96550003333'];

async function loginAndCheck(phone) {
  const res = await fetch(`${BASE}/api/mobile/vendor/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password: '123456' }),
  });
  const data = await res.json();
  if (data.token) {
    const profile = await fetch(`${BASE}/api/mobile/vendor/profile`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const pData = await profile.json();
    console.log(`  ${phone}: status=${profile.status} → ${JSON.stringify(pData.error || pData.vendor?.status || 'ok')}`);
    return { token: data.token, status: profile.status };
  }
  console.log(`  ${phone}: login failed - ${data.error}`);
  return null;
}

async function main() {
  console.log(`\nChecking vendors on: ${BASE}\n`);
  for (const phone of phones) {
    await loginAndCheck(phone);
  }
  console.log('\nIf status is 403, vendors need to be APPROVED in the database.');
  console.log('Run this SQL on your production database:');
  console.log("  UPDATE vendor_profiles SET status = 'APPROVED', phoneVerified = true WHERE status = 'PENDING';");
  console.log('');
}

main().catch(console.error);
