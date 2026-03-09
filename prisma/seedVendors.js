const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const vendors = [
  {
    name: 'أحمد محمد',
    phone: '96550001111',
    password: '123456',
    email: 'ahmed@farah.test',
    vendorType: 'RESTAURANT',
    businessName: 'Farah Kitchen',
    businessNameAr: 'مطبخ فرح',
    description: 'أفضل المأكولات الكويتية والعربية، وجبات طازجة يومياً مع خدمة توصيل سريعة.',
    address: 'شارع الخليج، بلوك 5',
    country: 'الكويت',
    city: 'حولي',
    area: 'السالمية',
    latitude: 29.3375,
    longitude: 48.0756,
    locations: [
      { locationName: 'الفرع الرئيسي - السالمية', address: 'شارع سالم المبارك، السالمية', city: 'حولي', area: 'السالمية', latitude: 29.3375, longitude: 48.0756, isMainLocation: true },
      { locationName: 'فرع حولي', address: 'شارع تونس، حولي', city: 'حولي', area: 'حولي', latitude: 29.3387, longitude: 48.0284, isMainLocation: false },
    ],
    walletBalance: 245.500,
  },
  {
    name: 'فاطمة علي',
    phone: '96550002222',
    password: '123456',
    email: 'fatima@farah.test',
    vendorType: 'SWEETS_SHOP',
    businessName: 'Sweet Farah',
    businessNameAr: 'حلويات فرح',
    description: 'تشكيلة واسعة من الحلويات الشرقية والغربية، كيك مناسبات، وتوزيعات أفراح.',
    address: 'مجمع الأفنيوز، الطابق الأرضي',
    country: 'الكويت',
    city: 'الفروانية',
    area: 'الري',
    latitude: 29.2976,
    longitude: 47.9562,
    locations: [
      { locationName: 'الفرع الرئيسي - الأفنيوز', address: 'مجمع الأفنيوز', city: 'الفروانية', area: 'الري', latitude: 29.2976, longitude: 47.9562, isMainLocation: true },
    ],
    walletBalance: 1320.750,
  },
  {
    name: 'خالد العنزي',
    phone: '96550003333',
    password: '123456',
    email: 'khaled@farah.test',
    vendorType: 'FASHION_STORE',
    businessName: 'Khaled Fashion',
    businessNameAr: 'أزياء خالد',
    description: 'أحدث صيحات الموضة الرجالية والنسائية، ماركات عالمية بأسعار منافسة.',
    address: 'المباركية، سوق الحريم',
    country: 'الكويت',
    city: 'العاصمة',
    area: 'المباركية',
    latitude: 29.3759,
    longitude: 47.9774,
    locations: [
      { locationName: 'الفرع الرئيسي - المباركية', address: 'سوق المباركية', city: 'العاصمة', area: 'المباركية', latitude: 29.3759, longitude: 47.9774, isMainLocation: true },
      { locationName: 'فرع الشويخ', address: 'المنطقة الحرة، الشويخ', city: 'العاصمة', area: 'الشويخ', latitude: 29.3456, longitude: 47.9312, isMainLocation: false },
    ],
    walletBalance: 890.000,
  },
];

async function main() {
  console.log('Seeding 3 test vendors...\n');

  for (const v of vendors) {
    const hashed = await bcrypt.hash(v.password, 10);

    const existing = await prisma.user.findUnique({ where: { phone: v.phone } });
    if (existing) {
      console.log(`  [skip] ${v.phone} (${v.businessNameAr}) already exists`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        name: v.name,
        phone: v.phone,
        email: v.email,
        password: hashed,
        role: 'PROVIDER',
        isActive: true,
      },
    });

    await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        vendorType: v.vendorType,
        status: 'APPROVED',
        businessName: v.businessName,
        businessNameAr: v.businessNameAr,
        description: v.description,
        address: v.address,
        country: v.country,
        city: v.city,
        area: v.area,
        latitude: v.latitude,
        longitude: v.longitude,
        googleMapsLink: `https://www.google.com/maps?q=${v.latitude},${v.longitude}`,
        phoneVerified: true,
        isActive: true,
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      },
    });

    for (const loc of v.locations) {
      await prisma.vendorLocation.create({ data: { userId: user.id, ...loc } });
    }

    await prisma.vendorWallet.create({
      data: { userId: user.id, balance: v.walletBalance, totalEarnings: v.walletBalance * 1.4 },
    });

    await prisma.notification.createMany({
      data: [
        { userId: user.id, title: 'مرحباً بك في فرح!', message: 'تم تفعيل حسابك بنجاح. ابدأ بإضافة خدماتك ومنتجاتك الآن.', type: 'INFO', category: 'SYSTEM' },
        { userId: user.id, title: 'طلب جديد', message: 'لديك طلب جديد بانتظار الموافقة. راجع تفاصيل الطلب الآن.', type: 'INFO', category: 'BOOKING' },
        { userId: user.id, title: 'تقييم جديد', message: 'حصلت على تقييم 5 نجوم من أحد العملاء. استمر في التميز!', type: 'INFO', category: 'REVIEW' },
      ],
    });

    console.log(`  [done] ${v.phone} / ${v.password}  →  ${v.businessNameAr} (${v.vendorType})`);
  }

  console.log('\n--- Test Accounts ---');
  console.log('Phone: 96550001111  |  Password: 123456  |  مطبخ فرح (RESTAURANT)');
  console.log('Phone: 96550002222  |  Password: 123456  |  حلويات فرح (SWEETS_SHOP)');
  console.log('Phone: 96550003333  |  Password: 123456  |  أزياء خالد (FASHION_STORE)');
  console.log('---\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
