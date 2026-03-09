/**
 * Full vendor seed: register + verify + approve + create services, locations, wallet, notifications.
 *
 * Usage:
 *   node prisma/seedVendorsAPI.js                                → local
 *   node prisma/seedVendorsAPI.js https://farah.developteam.site → production
 */
const BASE = process.argv[2] || 'http://localhost:8001';
const ADMIN = { email: 'admin@farah.com', password: 'admin123' };

const vendors = [
  {
    reg: { name:'أحمد محمد', phone:'96550001111', password:'123456', vendorType:'RESTAURANT', businessNameAr:'مطبخ فرح', country:'الكويت', city:'حولي', area:'السالمية', googleMapsLink:'https://www.google.com/maps?q=29.3375,48.0756' },
    locations: [
      { locationName:'الفرع الرئيسي - السالمية', address:'شارع سالم المبارك، السالمية', city:'حولي', area:'السالمية', latitude:29.3375, longitude:48.0756, isMainLocation:true },
      { locationName:'فرع حولي', address:'شارع تونس، حولي', city:'حولي', area:'حولي', latitude:29.3387, longitude:48.0284, isMainLocation:false },
    ],
    services: [
      { nameAr:'مشاوي مشكلة', name:'Mixed Grill', description:'تشكيلة مشاوي فاخرة مع أرز بسمتي وسلطات', price:8.500, isAvailable:true },
      { nameAr:'برياني دجاج', name:'Chicken Biryani', description:'برياني على الطريقة الهندية مع دجاج مبهّر', price:4.750, isAvailable:true },
      { nameAr:'فتوش', name:'Fattoush Salad', description:'سلطة فتوش طازجة مع خبز محمّص', price:2.000, isAvailable:true },
      { nameAr:'كنافة نابلسية', name:'Kunafa', description:'كنافة ساخنة بالجبنة مع قطر', price:3.250, isAvailable:true },
      { nameAr:'عصير ليمون بالنعناع', name:'Lemon Mint Juice', description:'عصير ليمون طازج بالنعناع البارد', price:1.500, isAvailable:true },
    ],
  },
  {
    reg: { name:'فاطمة علي', phone:'96550002222', password:'123456', vendorType:'SWEETS_SHOP', businessNameAr:'حلويات فرح', country:'الكويت', city:'الفروانية', area:'الري', googleMapsLink:'https://www.google.com/maps?q=29.2976,47.9562' },
    locations: [
      { locationName:'الفرع الرئيسي - الأفنيوز', address:'مجمع الأفنيوز، الطابق الأرضي', city:'الفروانية', area:'الري', latitude:29.2976, longitude:47.9562, isMainLocation:true },
    ],
    services: [
      { nameAr:'كيكة زفاف فاخرة', name:'Wedding Cake', description:'كيكة زفاف 3 طبقات مزينة بالورود', price:75.000, isAvailable:true },
      { nameAr:'بقلاوة مشكلة', name:'Baklava Mix', description:'علبة بقلاوة مشكلة 500 جرام', price:6.500, isAvailable:true },
      { nameAr:'كب كيك (12 حبة)', name:'Cupcakes 12pcs', description:'12 كب كيك بنكهات متنوعة', price:8.000, isAvailable:true },
      { nameAr:'تمور محشية', name:'Stuffed Dates', description:'تمور فاخرة محشية بالمكسرات', price:12.000, isAvailable:true },
      { nameAr:'توزيعات أفراح', name:'Wedding Favors', description:'توزيعات شوكولاتة فاخرة للمناسبات', price:0.750, isAvailable:true },
      { nameAr:'كيكة عيد ميلاد', name:'Birthday Cake', description:'كيكة عيد ميلاد مخصصة بالاسم', price:15.000, isAvailable:true },
    ],
  },
  {
    reg: { name:'خالد العنزي', phone:'96550003333', password:'123456', vendorType:'FASHION_STORE', businessNameAr:'أزياء خالد', country:'الكويت', city:'العاصمة', area:'المباركية', googleMapsLink:'https://www.google.com/maps?q=29.3759,47.9774' },
    locations: [
      { locationName:'الفرع الرئيسي - المباركية', address:'سوق المباركية', city:'العاصمة', area:'المباركية', latitude:29.3759, longitude:47.9774, isMainLocation:true },
      { locationName:'فرع الشويخ', address:'المنطقة الحرة، الشويخ', city:'العاصمة', area:'الشويخ', latitude:29.3456, longitude:47.9312, isMainLocation:false },
    ],
    services: [
      { nameAr:'ثوب رجالي فاخر', name:'Premium Thobe', description:'ثوب رجالي قماش إيطالي فاخر', price:45.000, isAvailable:true },
      { nameAr:'عباية نسائية', name:'Womens Abaya', description:'عباية نسائية مطرزة يدوياً', price:35.000, isAvailable:true },
      { nameAr:'شماغ أحمر', name:'Red Shemagh', description:'شماغ أحمر قطن 100%', price:8.000, isAvailable:true },
      { nameAr:'بشت رجالي', name:'Bisht', description:'بشت رجالي للمناسبات', price:120.000, isAvailable:true },
      { nameAr:'جلابية مغربية', name:'Moroccan Jellaba', description:'جلابية مغربية تقليدية', price:25.000, isAvailable:false },
    ],
  },
];

async function api(method, url, body, token) {
  const opts = { method, headers: {} };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const r = await fetch(`${BASE}${url}`, opts);
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

async function main() {
  console.log(`\n=== Full Vendor Seed (${BASE}) ===\n`);

  // Admin login
  const adm = await api('POST', '/api/auth/admin/login', ADMIN);
  if (!adm.data.token) { console.log('Admin login FAILED:', adm.data.error); process.exit(1); }
  const adminToken = adm.data.token;
  console.log('Admin login OK\n');

  for (const v of vendors) {
    const { reg } = v;
    console.log(`── ${reg.businessNameAr} (${reg.phone}) ──`);

    // Register
    const regRes = await api('POST', '/api/mobile/vendor/auth/register', reg);
    console.log(`  Register: ${regRes.ok ? 'OK' : regRes.data.error || 'exists'}`);

    // Verify OTP
    await api('POST', '/api/mobile/vendor/auth/verify-otp', { phone: reg.phone, otp: '123456' });

    // Login
    const login = await api('POST', '/api/mobile/vendor/auth/login', { phone: reg.phone, password: reg.password });
    if (!login.data.token) { console.log('  Login FAILED\n'); continue; }
    const token = login.data.token;
    const vendorId = login.data.vendor?.id;
    console.log('  Login: OK');

    // Approve
    if (vendorId) {
      await api('PATCH', `/api/admin/vendors/${vendorId}/approve`, null, adminToken);
      console.log('  Approved');
    }

    // Re-login after approval (get fresh token with approved status)
    const login2 = await api('POST', '/api/mobile/vendor/auth/login', { phone: reg.phone, password: reg.password });
    const tk = login2.data.token || token;

    // Add locations
    for (const loc of v.locations) {
      const r = await api('POST', '/api/mobile/vendor/locations', loc, tk);
      console.log(`  Location "${loc.locationName}": ${r.ok ? 'OK' : r.data.error || r.status}`);
    }

    // Add services
    for (const svc of v.services) {
      const r = await api('POST', '/api/mobile/vendor/services', svc, tk);
      console.log(`  Service "${svc.nameAr}": ${r.ok ? 'OK' : r.data.error || r.status}`);
    }

    // Check dashboard
    const dash = await api('GET', '/api/mobile/vendor/dashboard', null, tk);
    console.log(`  Dashboard: ${dash.ok ? 'OK' : dash.status}`);

    // Check wallet
    const wall = await api('GET', '/api/mobile/vendor/wallet', null, tk);
    console.log(`  Wallet: ${wall.ok ? `balance=${wall.data.wallet?.balance ?? 0}` : wall.status}`);

    console.log('');
  }

  console.log('========================================');
  console.log('Test Accounts (password: 123456):');
  console.log('  96550001111  مطبخ فرح (RESTAURANT)');
  console.log('  96550002222  حلويات فرح (SWEETS_SHOP)');
  console.log('  96550003333  أزياء خالد (FASHION_STORE)');
  console.log('========================================\n');
}

main().catch(e => { console.error(e); process.exit(1); });
