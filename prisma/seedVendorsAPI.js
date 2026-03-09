/**
 * Seed vendors via the REST API (works on any environment - local or production).
 * Usage:
 *   node prisma/seedVendorsAPI.js                          → uses http://localhost:8001
 *   node prisma/seedVendorsAPI.js https://farah.developteam.site  → uses production
 */
const BASE = process.argv[2] || 'http://localhost:8001';

const vendors = [
  { name:'أحمد محمد', phone:'96550001111', password:'123456', vendorType:'RESTAURANT', businessNameAr:'مطبخ فرح', country:'الكويت', city:'حولي', area:'السالمية', googleMapsLink:'https://www.google.com/maps?q=29.3375,48.0756' },
  { name:'فاطمة علي', phone:'96550002222', password:'123456', vendorType:'SWEETS_SHOP', businessNameAr:'حلويات فرح', country:'الكويت', city:'الفروانية', area:'الري', googleMapsLink:'https://www.google.com/maps?q=29.2976,47.9562' },
  { name:'خالد العنزي', phone:'96550003333', password:'123456', vendorType:'FASHION_STORE', businessNameAr:'أزياء خالد', country:'الكويت', city:'العاصمة', area:'المباركية', googleMapsLink:'https://www.google.com/maps?q=29.3759,47.9774' },
];

async function register(v) {
  const res = await fetch(`${BASE}/api/mobile/vendor/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(v),
  });
  const data = await res.json();
  if (!res.ok) {
    console.log(`  [${res.status}] ${v.phone}: ${data.error || JSON.stringify(data)}`);
    return null;
  }
  console.log(`  [registered] ${v.phone} → ${v.businessNameAr}`);
  return data;
}

async function verifyOtp(phone) {
  const res = await fetch(`${BASE}/api/mobile/vendor/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: '123456' }),
  });
  const data = await res.json();
  if (data.success) console.log(`  [verified] ${phone}`);
  else console.log(`  [otp skip] ${phone}: ${data.error || 'could not verify'}`);
  return data;
}

async function login(phone, password) {
  const res = await fetch(`${BASE}/api/mobile/vendor/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  const data = await res.json();
  if (data.success) console.log(`  [login ok] ${phone}`);
  else console.log(`  [login] ${phone}: ${data.error || 'failed'}`);
  return data;
}

async function main() {
  console.log(`\nSeeding vendors via API: ${BASE}\n`);

  for (const v of vendors) {
    await register(v);
    await verifyOtp(v.phone);
    const loginRes = await login(v.phone, v.password);
    if (loginRes.success) console.log(`  ✓ Ready: ${v.phone} / ${v.password}\n`);
    else console.log(`  ✗ Could not login: ${v.phone}\n`);
  }

  console.log('--- Test Accounts (password: 123456) ---');
  console.log('96550001111  مطبخ فرح (RESTAURANT)');
  console.log('96550002222  حلويات فرح (SWEETS_SHOP)');
  console.log('96550003333  أزياء خالد (FASHION_STORE)');
  console.log('---\n');
}

main().catch(e => console.error(e));
