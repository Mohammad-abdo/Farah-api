const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🗑️  Clearing existing data...');
  // Delete in correct order (respecting foreign key constraints)
  try {
    await prisma.payment.deleteMany();
    await prisma.bookingService.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.review.deleteMany();
    await prisma.notification.deleteMany();
    if (prisma.report && prisma.report.deleteMany) await prisma.report.deleteMany();
    if (prisma.otp && prisma.otp.deleteMany) await prisma.otp.deleteMany();
    if (prisma.rolePermission && prisma.rolePermission.deleteMany) await prisma.rolePermission.deleteMany();
    if (prisma.permission && prisma.permission.deleteMany) await prisma.permission.deleteMany();
    await prisma.service.deleteMany();
    await prisma.venue.deleteMany();
    await prisma.category.deleteMany();
    try { if (prisma.onboardingSlide && prisma.onboardingSlide.deleteMany) await prisma.onboardingSlide.deleteMany(); } catch (e) {}
    if (prisma.slider && prisma.slider.deleteMany) await prisma.slider.deleteMany();
    if (prisma.about && prisma.about.deleteMany) await prisma.about.deleteMany();
    if (prisma.privacy && prisma.privacy.deleteMany) await prisma.privacy.deleteMany();
    if (prisma.terms && prisma.terms.deleteMany) await prisma.terms.deleteMany();
    // Vendor system (order matters: children first)
    try {
      await prisma.vendorOrderItem.deleteMany();
      await prisma.vendorOrder.deleteMany();
      await prisma.vendorTransaction.deleteMany();
      await prisma.vendorWallet.deleteMany();
      await prisma.vendorLocation.deleteMany();
      await prisma.vendorService.deleteMany();
      await prisma.vendorProfile.deleteMany();
      await prisma.vendorOTP.deleteMany();
      if (prisma.systemCommissionRecord && prisma.systemCommissionRecord.deleteMany) await prisma.systemCommissionRecord.deleteMany();
    } catch (e) { console.warn('Vendor clear:', e.message); }
    await prisma.user.deleteMany();
  } catch (error) {
    console.warn('⚠️ Some models may not exist, continuing...', error.message);
  }

  // Create Admin User
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@farah.com' },
    update: {
      name: 'Admin User',
      nameAr: 'مدير النظام',
      password: hashedPassword,
      location: 'Kuwait City',
      locationAr: 'مدينة الكويت',
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      name: 'Admin User',
      nameAr: 'مدير النظام',
      email: 'admin@farah.com',
      phone: '+96550000000',
      password: hashedPassword,
      location: 'Kuwait City',
      locationAr: 'مدينة الكويت',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin created:', admin.email, '| Password: admin123');

  // Create Provider Users (with password for vendor login)
  console.log('🏢 Creating provider users...');
  const providerPassword = await bcrypt.hash('provider123', 10);
  const providers = [];
  const providerData = [
    { name: 'Ahmed Al-Sabah', nameAr: 'أحمد الصباح', phone: '+96550000001', email: 'provider1@farah.com', location: 'Salmiya', locationAr: 'السالمية' },
    { name: 'Fatima Al-Khaled', nameAr: 'فاطمة الخالد', phone: '+96550000002', email: 'provider2@farah.com', location: 'Hawally', locationAr: 'حولي' },
    { name: 'Mohammed Al-Rashid', nameAr: 'محمد الراشد', phone: '+96550000003', email: 'provider3@farah.com', location: 'Jabriya', locationAr: 'الجابرية' },
    { name: 'Sara Al-Mutairi', nameAr: 'سارة المطيري', phone: '+96550000004', email: 'provider4@farah.com', location: 'Mishref', locationAr: 'مشرف' },
    { name: 'Khalid Al-Otaibi', nameAr: 'خالد العتيبي', phone: '+96550000005', email: 'provider5@farah.com', location: 'Salwa', locationAr: 'سلوى' },
  ];

  for (const providerInfo of providerData) {
    const provider = await prisma.user.create({
      data: {
        ...providerInfo,
        password: providerPassword,
        role: 'PROVIDER',
        isActive: true,
      },
    });
    providers.push(provider);
  }
  console.log(`✅ Created ${providers.length} providers (password: provider123)`);

  // --- Vendor system: profiles, wallets, locations, services, orders, transactions ---
  const vendorTypes = ['RESTAURANT', 'FASHION_STORE', 'SWEETS_SHOP', 'HEADPHONES_RENTAL', 'RESTAURANT'];
  const businessNames = ['Al-Sabah Kitchen', 'Fatima Boutique', 'Rashid Sweets', 'Sara Headphones', 'Golden Fork'];
  const businessNamesAr = ['مطبخ الصباح', 'بوتيك فاطمة', 'حلويات الراشد', 'سماعات سارة', 'الشوكة الذهبية'];

  for (let p = 0; p < providers.length; p++) {
    const user = providers[p];
    console.log(`   Vendor data for ${user.name}...`);

    await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        vendorType: vendorTypes[p],
        status: 'APPROVED',
        businessName: businessNames[p],
        businessNameAr: businessNamesAr[p],
        description: `Provider business ${businessNames[p]}`,
        address: `${user.location}, Kuwait`,
        country: 'Kuwait',
        city: user.location,
        area: user.location,
        latitude: 29.3 + Math.random() * 0.2,
        longitude: 47.9 + Math.random() * 0.3,
        phoneVerified: true,
        isActive: true,
        rating: 4 + Math.random(),
      },
    });

    const wallet = await prisma.vendorWallet.create({
      data: {
        userId: user.id,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        totalCommissionPaid: 0,
        pendingBalance: 0,
        isFrozen: false,
      },
    });

    const loc1 = await prisma.vendorLocation.create({
      data: {
        userId: user.id,
        locationName: `${businessNames[p]} - Main`,
        address: `${user.location}, Block 1, Street 2, Kuwait`,
        city: user.location,
        area: user.location,
        latitude: 29.3 + Math.random() * 0.2,
        longitude: 47.9 + Math.random() * 0.3,
        isMainLocation: true,
      },
    });
    const loc2 = await prisma.vendorLocation.create({
      data: {
        userId: user.id,
        locationName: `${businessNames[p]} - Branch`,
        address: `${user.location}, Block 5, Kuwait`,
        city: user.location,
        area: user.location,
        latitude: 29.32 + Math.random() * 0.15,
        longitude: 47.92 + Math.random() * 0.2,
        isMainLocation: false,
      },
    });
    const locations = [loc1, loc2];

    const serviceNames = [
      ['Main Dish', 'Dessert', 'Drinks', 'Catering Pack'],
      ['Dress Rental', 'Suit Rental', 'Accessories'],
      ['Kunafa', 'Baklava', 'Mixed Sweets'],
      ['Headphones Set', 'Microphone', 'Speaker Pack'],
      ['Breakfast Pack', 'Lunch Pack', 'Dinner Pack'],
    ];
    const vendorServices = [];
    for (let s = 0; s < serviceNames[p].length; s++) {
      const svc = await prisma.vendorService.create({
        data: {
          userId: user.id,
          name: serviceNames[p][s],
          nameAr: serviceNames[p][s],
          description: `Service: ${serviceNames[p][s]}`,
          price: 5 + Math.floor(Math.random() * 50),
          images: [],
          isAvailable: true,
        },
      });
      vendorServices.push(svc);
    }

    const orderStatuses = ['PENDING', 'ACCEPTED', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED'];
    const payStatuses = ['PENDING', 'PAID', 'PAID', 'PAID'];
    let totalEarnings = 0;
    let totalCommission = 0;

    for (let o = 0; o < 4; o++) {
      const loc = locations[o % 2];
      const status = orderStatuses[o % orderStatuses.length];
      const paymentStatus = payStatuses[o % payStatuses.length];
      const item1 = vendorServices[0];
      const item2 = vendorServices.length > 1 ? vendorServices[1] : vendorServices[0];
      const qty1 = 1 + (o % 3);
      const qty2 = o % 2;
      const totalAmount = item1.price * qty1 + (qty2 ? item2.price * qty2 : 0);
      const commissionRate = 0.1;
      const commission = totalAmount * commissionRate;
      const netAmount = totalAmount - commission;

      const order = await prisma.vendorOrder.create({
        data: {
          orderNumber: `VO-${user.id.slice(0, 8)}-${String(o + 1).padStart(3, '0')}`,
          userId: user.id,
          vendorLocationId: loc.id,
          customerName: `Customer ${o + 1}`,
          customerPhone: `+9655${String(1000000 + o).slice(-7)}`,
          status,
          totalAmount,
          paymentStatus,
          notes: `Order note ${o + 1}`,
          address: `Address for order ${o + 1}, Kuwait`,
          vendorLatitude: loc.latitude,
          vendorLongitude: loc.longitude,
          items: {
            create: [
              { serviceId: item1.id, quantity: qty1, price: item1.price },
              ...(qty2 ? [{ serviceId: item2.id, quantity: qty2, price: item2.price }] : []),
            ],
          },
        },
      });

      if (paymentStatus === 'PAID' && (status === 'DELIVERED' || status === 'ACCEPTED' || status === 'IN_DELIVERY')) {
        totalEarnings += netAmount;
        totalCommission += commission;
        await prisma.vendorTransaction.create({
          data: {
            userId: user.id,
            type: 'CREDIT',
            category: 'ORDER_INCOME',
            amount: totalAmount,
            commission,
            netAmount,
            status: 'COMPLETED',
            description: `Order ${order.orderNumber}`,
            reference: order.id,
            referenceOrderId: order.id,
          },
        });
        await prisma.vendorTransaction.create({
          data: {
            userId: user.id,
            type: 'DEBIT',
            category: 'COMMISSION_DEDUCTION',
            amount: commission,
            status: 'COMPLETED',
            description: `Commission for ${order.orderNumber}`,
            referenceOrderId: order.id,
          },
        });
      }
    }

    await prisma.vendorTransaction.create({
      data: {
        userId: user.id,
        type: 'CREDIT',
        category: 'MANUAL_DEPOSIT',
        amount: 100,
        netAmount: 100,
        status: 'COMPLETED',
        description: 'Initial deposit',
        paymentMethod: 'BANK',
      },
    });
    await prisma.vendorTransaction.create({
      data: {
        userId: user.id,
        type: 'DEBIT',
        category: 'WITHDRAWAL',
        amount: 20,
        netAmount: -20,
        status: 'COMPLETED',
        description: 'Withdrawal to bank',
        paymentMethod: 'BANK',
      },
    });

    await prisma.vendorWallet.update({
      where: { id: wallet.id },
      data: {
        balance: 80 + totalEarnings - 20,
        totalEarnings: totalEarnings + 100,
        totalWithdrawn: 20,
        totalCommissionPaid: totalCommission,
        pendingBalance: 0,
      },
    });
  }
  console.log('✅ Vendor profiles, wallets, locations, services, orders & transactions created for 5 providers');

  // Create Customer Users
  console.log('👥 Creating customer users...');
  const customers = [];
  const customerData = [
    { name: 'Ali Al-Ahmad', nameAr: 'علي الأحمد', phone: '+96550111111', email: 'customer1@farah.com', location: 'Kuwait City', locationAr: 'مدينة الكويت' },
    { name: 'Noor Al-Salem', nameAr: 'نور السالم', phone: '+96550111112', email: 'customer2@farah.com', location: 'Salmiya', locationAr: 'السالمية' },
    { name: 'Omar Al-Dosari', nameAr: 'عمر الدوسري', phone: '+96550111113', email: 'customer3@farah.com', location: 'Hawally', locationAr: 'حولي' },
    { name: 'Layla Al-Mansouri', nameAr: 'ليلى المنصوري', phone: '+96550111114', email: 'customer4@farah.com', location: 'Jabriya', locationAr: 'الجابرية' },
    { name: 'Yousef Al-Harbi', nameAr: 'يوسف الحربي', phone: '+96550111115', email: 'customer5@farah.com', location: 'Mishref', locationAr: 'مشرف' },
    { name: 'Mariam Al-Shammari', nameAr: 'مريم الشمري', phone: '+96550111116', email: 'customer6@farah.com', location: 'Salwa', locationAr: 'سلوى' },
    { name: 'Hassan Al-Mutairi', nameAr: 'حسن المطيري', phone: '+96550111117', email: 'customer7@farah.com', location: 'Fahaheel', locationAr: 'الفحيحيل' },
    { name: 'Aisha Al-Otaibi', nameAr: 'عائشة العتيبي', phone: '+96550111118', email: 'customer8@farah.com', location: 'Ahmadi', locationAr: 'الأحمدي' },
    { name: 'Fahad Al-Rashid', nameAr: 'فهد الراشد', phone: '+96550111119', email: 'customer9@farah.com', location: 'Kuwait City', locationAr: 'مدينة الكويت' },
    { name: 'Nada Al-Khaled', nameAr: 'ندى الخالد', phone: '+96550111120', email: 'customer10@farah.com', location: 'Salmiya', locationAr: 'السالمية' },
    { name: 'Tariq Al-Sabah', nameAr: 'طارق الصباح', phone: '+96550111121', email: 'customer11@farah.com', location: 'Hawally', locationAr: 'حولي' },
    { name: 'Rania Al-Mansouri', nameAr: 'رانيا المنصوري', phone: '+96550111122', email: 'customer12@farah.com', location: 'Jabriya', locationAr: 'الجابرية' },
    { name: 'Majed Al-Harbi', nameAr: 'ماجد الحربي', phone: '+96550111123', email: 'customer13@farah.com', location: 'Mishref', locationAr: 'مشرف' },
    { name: 'Hala Al-Shammari', nameAr: 'هالة الشمري', phone: '+96550111124', email: 'customer14@farah.com', location: 'Salwa', locationAr: 'سلوى' },
    { name: 'Bader Al-Mutairi', nameAr: 'بدر المطيري', phone: '+96550111125', email: 'customer15@farah.com', location: 'Fahaheel', locationAr: 'الفحيحيل' },
  ];

  for (const customerInfo of customerData) {
    const customer = await prisma.user.create({
      data: {
        ...customerInfo,
        role: 'CUSTOMER',
        isActive: true,
      },
    });
    customers.push(customer);
  }
  console.log(`✅ Created ${customers.length} customers`);

  // Create Default OTPs for testing (123456 for all customers)
  console.log('🔐 Creating default OTPs for testing...');
  const defaultOTP = '123456';
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now (for testing)
  
  try {
    // Create OTP for admin
    await prisma.otp.create({
      data: {
        phone: admin.phone,
        code: defaultOTP,
        expiresAt: expiresAt,
        userId: admin.id,
        used: false,
      },
    });

    // Create OTP for first 5 customers
    for (let i = 0; i < Math.min(5, customers.length); i++) {
      const customer = customers[i];
      await prisma.otp.create({
        data: {
          phone: customer.phone,
          code: defaultOTP,
          expiresAt: expiresAt,
          userId: customer.id,
          used: false,
        },
      });
    }
    console.log(`✅ Created default OTPs (${defaultOTP}) for admin and first 5 customers`);
  } catch (error) {
    console.warn('⚠️ Error creating default OTPs:', error.message);
  }

  // Create Categories
  console.log('📁 Creating categories...');
  const categories = [];
  const categoryData = [
    { name: 'Wedding Halls', nameAr: 'قاعات الأفراح', description: 'Beautiful wedding halls', icon: '💒' },
    { name: 'Photography', nameAr: 'التصوير', description: 'Professional photography services', icon: '📸' },
    { name: 'Catering', nameAr: 'التموين', description: 'Catering services', icon: '🍽️' },
    { name: 'Decoration', nameAr: 'الديكور', description: 'Event decoration', icon: '🎨' },
    { name: 'Entertainment', nameAr: 'الترفيه', description: 'Entertainment services', icon: '🎤' },
    { name: 'Transportation', nameAr: 'النقل', description: 'Transportation services', icon: '🚗' },
    { name: 'Makeup', nameAr: 'المكياج', description: 'Makeup and beauty services', icon: '💄' },
    { name: 'Flowers', nameAr: 'الزهور', description: 'Flower arrangements', icon: '🌸' },
  ];

  for (const catInfo of categoryData) {
    const category = await prisma.category.create({
      data: catInfo,
    });
    categories.push(category);
  }
  console.log(`✅ Created ${categories.length} categories`);

  // Create Venues (more than 10)
  console.log('🏛️  Creating venues...');
  const venues = [];
  const venueData = [
    { name: 'Royal Palace Hall', nameAr: 'قاعة القصر الملكي', price: 5000, capacity: 500, location: 'Kuwait City', providerIndex: 0 },
    { name: 'Grand Ballroom', nameAr: 'القاعة الكبرى', price: 4500, capacity: 400, location: 'Salmiya', providerIndex: 0 },
    { name: 'Elegant Garden', nameAr: 'الحديقة الأنيقة', price: 4000, capacity: 300, location: 'Hawally', providerIndex: 1 },
    { name: 'Luxury Venue', nameAr: 'القاعة الفاخرة', price: 5500, capacity: 600, location: 'Jabriya', providerIndex: 1 },
    { name: 'Modern Hall', nameAr: 'القاعة العصرية', price: 3500, capacity: 250, location: 'Mishref', providerIndex: 2 },
    { name: 'Classic Venue', nameAr: 'القاعة الكلاسيكية', price: 4200, capacity: 350, location: 'Salwa', providerIndex: 2 },
    { name: 'Beachside Hall', nameAr: 'قاعة الشاطئ', price: 4800, capacity: 450, location: 'Fahaheel', providerIndex: 3 },
    { name: 'Skyline Venue', nameAr: 'قاعة الأفق', price: 5200, capacity: 550, location: 'Ahmadi', providerIndex: 3 },
    { name: 'Crystal Palace', nameAr: 'قاعة الكريستال', price: 6000, capacity: 700, location: 'Kuwait City', providerIndex: 4 },
    { name: 'Golden Hall', nameAr: 'القاعة الذهبية', price: 4700, capacity: 400, location: 'Salmiya', providerIndex: 4 },
    { name: 'Diamond Venue', nameAr: 'قاعة الماس', price: 5800, capacity: 650, location: 'Hawally', providerIndex: 0 },
    { name: 'Pearl Hall', nameAr: 'قاعة اللؤلؤ', price: 4400, capacity: 380, location: 'Jabriya', providerIndex: 1 },
    { name: 'Emerald Venue', nameAr: 'قاعة الزمرد', price: 5100, capacity: 520, location: 'Mishref', providerIndex: 2 },
    { name: 'Sapphire Hall', nameAr: 'قاعة الياقوت', price: 4600, capacity: 420, location: 'Salwa', providerIndex: 3 },
    { name: 'Ruby Venue', nameAr: 'قاعة الياقوت الأحمر', price: 5300, capacity: 580, location: 'Fahaheel', providerIndex: 4 },
  ];

  const venueImages = [
    ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800'],
    ['https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800'],
    ['https://images.unsplash.com/photo-1511578314322-379afb476865?w=800'],
    ['https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800'],
    ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800'],
  ];

  for (let i = 0; i < venueData.length; i++) {
    const venueInfo = venueData[i];
    const venue = await prisma.venue.create({
      data: {
        name: venueInfo.name,
        nameAr: venueInfo.nameAr,
        description: `Beautiful ${venueInfo.name} perfect for weddings and events`,
        descriptionAr: `${venueInfo.nameAr} جميلة مثالية للأفراح والمناسبات`,
        price: venueInfo.price,
        providerId: providers[venueInfo.providerIndex].id,
        images: venueImages[i % venueImages.length],
        location: venueInfo.location,
        address: `${venueInfo.location}, Kuwait`,
        capacity: venueInfo.capacity,
        rating: Math.random() * 2 + 3.5, // Random rating between 3.5 and 5.5
        reviewCount: Math.floor(Math.random() * 50) + 10,
        clients: Math.floor(Math.random() * 30),
        isActive: true,
      },
    });
    venues.push(venue);
  }
  console.log(`✅ Created ${venues.length} venues`);

  // Create Services (many services)
  console.log('🎯 Creating services...');
  const services = [];
  const serviceData = [
    // Photography Services
    { name: 'Wedding Photography', nameAr: 'تصوير الأفراح', price: 800, categoryIndex: 1, providerIndex: 0 },
    { name: 'Event Photography', nameAr: 'تصوير المناسبات', price: 600, categoryIndex: 1, providerIndex: 0 },
    { name: 'Portrait Photography', nameAr: 'التصوير الشخصي', price: 400, categoryIndex: 1, providerIndex: 1 },
    { name: 'Video Production', nameAr: 'إنتاج الفيديو', price: 1200, categoryIndex: 1, providerIndex: 1 },
    { name: 'Drone Photography', nameAr: 'التصوير بالطائرة', price: 1000, categoryIndex: 1, providerIndex: 2 },
    
    // Catering Services
    { name: 'Buffet Service', nameAr: 'خدمة البوفيه', price: 50, categoryIndex: 2, providerIndex: 2 },
    { name: 'Fine Dining', nameAr: 'المأكولات الفاخرة', price: 80, categoryIndex: 2, providerIndex: 2 },
    { name: 'BBQ Service', nameAr: 'خدمة الشواء', price: 60, categoryIndex: 2, providerIndex: 3 },
    { name: 'Dessert Table', nameAr: 'طاولة الحلويات', price: 40, categoryIndex: 2, providerIndex: 3 },
    { name: 'Coffee Service', nameAr: 'خدمة القهوة', price: 30, categoryIndex: 2, providerIndex: 4 },
    
    // Decoration Services
    { name: 'Wedding Decoration', nameAr: 'ديكور الأفراح', price: 2000, categoryIndex: 3, providerIndex: 0 },
    { name: 'Stage Setup', nameAr: 'إعداد المسرح', price: 1500, categoryIndex: 3, providerIndex: 1 },
    { name: 'Lighting Design', nameAr: 'تصميم الإضاءة', price: 1200, categoryIndex: 3, providerIndex: 2 },
    { name: 'Backdrop Design', nameAr: 'تصميم الخلفية', price: 800, categoryIndex: 3, providerIndex: 3 },
    { name: 'Table Setting', nameAr: 'ترتيب الطاولات', price: 600, categoryIndex: 3, providerIndex: 4 },
    
    // Entertainment Services
    { name: 'DJ Service', nameAr: 'خدمة الدي جي', price: 1000, categoryIndex: 4, providerIndex: 0 },
    { name: 'Live Band', nameAr: 'الفرقة الموسيقية', price: 2000, categoryIndex: 4, providerIndex: 1 },
    { name: 'Singer Performance', nameAr: 'أداء المغني', price: 1500, categoryIndex: 4, providerIndex: 2 },
    { name: 'Sound System', nameAr: 'نظام الصوت', price: 800, categoryIndex: 4, providerIndex: 3 },
    { name: 'Dance Performance', nameAr: 'أداء الرقص', price: 1200, categoryIndex: 4, providerIndex: 4 },
    
    // Transportation Services
    { name: 'Luxury Car Rental', nameAr: 'تأجير السيارات الفاخرة', price: 500, categoryIndex: 5, providerIndex: 0 },
    { name: 'Bus Service', nameAr: 'خدمة الحافلات', price: 300, categoryIndex: 5, providerIndex: 1 },
    { name: 'Limousine Service', nameAr: 'خدمة الليموزين', price: 700, categoryIndex: 5, providerIndex: 2 },
    
    // Makeup Services
    { name: 'Bridal Makeup', nameAr: 'مكياج العروس', price: 400, categoryIndex: 6, providerIndex: 3 },
    { name: 'Hair Styling', nameAr: 'تصفيف الشعر', price: 300, categoryIndex: 6, providerIndex: 4 },
    { name: 'Full Beauty Package', nameAr: 'باقة الجمال الكاملة', price: 800, categoryIndex: 6, providerIndex: 0 },
    
    // Flower Services
    { name: 'Bridal Bouquet', nameAr: 'باقة العروس', price: 200, categoryIndex: 7, providerIndex: 1 },
    { name: 'Centerpieces', nameAr: 'مراكز الطاولات', price: 150, categoryIndex: 7, providerIndex: 2 },
    { name: 'Flower Arch', nameAr: 'قوس الزهور', price: 500, categoryIndex: 7, providerIndex: 3 },
    { name: 'Flower Wall', nameAr: 'جدار الزهور', price: 800, categoryIndex: 7, providerIndex: 4 },
  ];

  const serviceImages = [
    ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800'],
    ['https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800'],
    ['https://images.unsplash.com/photo-1511578314322-379afb476865?w=800'],
  ];

  for (let i = 0; i < serviceData.length; i++) {
    const serviceInfo = serviceData[i];
    const service = await prisma.service.create({
      data: {
        name: serviceInfo.name,
        nameAr: serviceInfo.nameAr,
        description: `Professional ${serviceInfo.name} service`,
        descriptionAr: `خدمة ${serviceInfo.nameAr} احترافية`,
        price: serviceInfo.price,
        categoryId: categories[serviceInfo.categoryIndex].id,
        providerId: providers[serviceInfo.providerIndex].id,
        images: serviceImages[i % serviceImages.length],
        location: providers[serviceInfo.providerIndex].location,
        rating: Math.random() * 2 + 3.5,
        reviewCount: Math.floor(Math.random() * 30) + 5,
        isActive: true,
      },
    });
    services.push(service);
  }
  console.log(`✅ Created ${services.length} services`);

  // Create Bookings
  console.log('📅 Creating bookings...');
  const bookings = [];
  const bookingStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  const paymentStatuses = ['PENDING', 'PAID', 'FAILED'];
  const paymentMethods = ['CASH', 'CREDIT_CARD', 'APPLE_PAY', 'GOOGLE_PAY'];

  for (let i = 0; i < 30; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const venue = venues[Math.floor(Math.random() * venues.length)];
    const status = bookingStatuses[Math.floor(Math.random() * bookingStatuses.length)];
    const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    // Random date in the future or past
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + (Math.random() * 60 - 30)); // -30 to +30 days
    
    // Select random services
    const selectedServices = services
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 3) + 1); // 1-3 services
    
    const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
    const totalAmount = venue.price + servicesTotal;
    const discount = Math.random() * 500; // Random discount up to 500
    const finalAmount = totalAmount - discount;

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: `BK${String(i + 1).padStart(6, '0')}`,
        customerId: customer.id,
        venueId: venue.id,
        date: eventDate,
        eventDate: eventDate.toISOString().split('T')[0],
        status: status,
        totalAmount: totalAmount,
        discount: discount,
        finalAmount: finalAmount,
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus,
        notes: `Booking notes for ${customer.name}`,
        services: {
          create: selectedServices.map(service => ({
            serviceId: service.id,
            price: service.price,
          })),
        },
      },
    });
    bookings.push(booking);

    // Create payment if paid
    if (paymentStatus === 'PAID') {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: finalAmount,
          method: paymentMethod,
          status: 'PAID',
          transactionId: `TXN${String(i + 1).padStart(8, '0')}`,
        },
      });
    }
  }
  console.log(`✅ Created ${bookings.length} bookings`);

  // Create Reviews
  console.log('⭐ Creating reviews...');
  const reviews = [];
  for (let i = 0; i < 50; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const isVenueReview = Math.random() > 0.5;
    
    if (isVenueReview && venues.length > 0) {
      const venue = venues[Math.floor(Math.random() * venues.length)];
      const review = await prisma.review.create({
        data: {
          userId: customer.id,
          venueId: venue.id,
          rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
          comment: `Great venue! Highly recommended.`,
          commentAr: `قاعة رائعة! أنصح بها بشدة.`,
        },
      });
      reviews.push(review);
    } else if (services.length > 0) {
      const service = services[Math.floor(Math.random() * services.length)];
      const review = await prisma.review.create({
        data: {
          userId: customer.id,
          serviceId: service.id,
          rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
          comment: `Excellent service! Very professional.`,
          commentAr: `خدمة ممتازة! احترافية جداً.`,
        },
      });
      reviews.push(review);
    }
  }
  console.log(`✅ Created ${reviews.length} reviews`);

  // Create Notifications
  console.log('🔔 Creating notifications...');
  const notificationCategories = ['BOOKING', 'PAYMENT', 'REVIEW', 'SYSTEM', 'USER', 'VENUE', 'SERVICE'];
  for (let i = 0; i < 20; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const category = notificationCategories[Math.floor(Math.random() * notificationCategories.length)];
    await prisma.notification.create({
      data: {
        userId: customer.id,
        title: 'New Booking Confirmed',
        message: 'Your booking has been confirmed successfully.',
        type: 'INFO',
        category: category,
        isRead: Math.random() > 0.5,
      },
    });
  }
  console.log('✅ Created 20 notifications');

  // Create Sliders
  console.log('🖼️  Creating sliders...');
  try {
    const sliderImages = [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200',
      'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200',
    ];
    
    for (let i = 0; i < 3; i++) {
      await prisma.slider.create({
        data: {
          title: `Slider ${i + 1}`,
          titleAr: `سلايدر ${i + 1}`,
          description: `Beautiful slider ${i + 1}`,
          descriptionAr: `سلايدر جميل ${i + 1}`,
          image: sliderImages[i],
          order: i,
          isActive: true,
        },
      });
    }
    console.log('✅ Created 3 sliders');
  } catch (error) {
    console.warn('⚠️ Could not create sliders:', error.message);
  }

  // Create Onboarding Slides
  console.log('📱 Creating onboarding slides...');
  try {
    const onboardingImages = [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&h=1200&fit=crop',
      'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=1200&fit=crop',
    ];
    
    for (let i = 0; i < 3; i++) {
      await prisma.onboardingSlide.create({
        data: {
          title: `Welcome to Farah ${i + 1}`,
          titleAr: `مرحباً بك في افراحنا${i + 1}`,
          subtitle: `Everything you need for your event ${i + 1}`,
          subtitleAr: `كل ما تحتاجه لمناسبتك ${i + 1}`,
          image: onboardingImages[i],
          order: i,
          isActive: true,
        },
      });
    }
    console.log('✅ Created 3 onboarding slides');
  } catch (error) {
    console.warn('⚠️ Could not create onboarding slides:', error.message);
  }

  // Create Content (About, Privacy, Terms)
  console.log('📄 Creating content pages...');
  try {
    const existingAbout = await prisma.about.findFirst();
    if (!existingAbout) {
      await prisma.about.create({
        data: {
          title: 'About Farah',
          titleAr: 'من نحن',
          content: 'Farah is the leading event management platform in Kuwait, providing comprehensive services for weddings and events.',
          contentAr: 'افراحناهي المنصة الرائدة لإدارة المناسبات في الكويت، وتوفر خدمات شاملة للأفراح والمناسبات.',
          isActive: true,
        },
      });
    }

    const existingPrivacy = await prisma.privacy.findFirst();
    if (!existingPrivacy) {
      await prisma.privacy.create({
        data: {
          title: 'Privacy Policy',
          titleAr: 'سياسة الخصوصية',
          content: 'Our privacy policy outlines how we collect, use, and protect your personal information.',
          contentAr: 'توضح سياسة الخصوصية الخاصة بنا كيفية جمع واستخدام وحماية معلوماتك الشخصية.',
          version: '1.0',
          isActive: true,
        },
      });
    }

    const existingTerms = await prisma.terms.findFirst();
    if (!existingTerms) {
      await prisma.terms.create({
        data: {
          title: 'Terms & Conditions',
          titleAr: 'الشروط والأحكام',
          content: 'Please read our terms and conditions carefully before using our services.',
          contentAr: 'يرجى قراءة الشروط والأحكام بعناية قبل استخدام خدماتنا.',
          version: '1.0',
          isActive: true,
        },
      });
    }
    console.log('✅ Created content pages');
  } catch (error) {
    console.warn('⚠️ Could not create content pages:', error.message);
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - Admin: 1 (admin@farah.com / admin123)`);
  console.log(`   - Providers: ${providers.length}`);
  console.log(`   - Customers: ${customers.length}`);
  console.log(`   - Categories: ${categories.length}`);
  console.log(`   - Venues: ${venues.length}`);
  console.log(`   - Services: ${services.length}`);
  console.log(`   - Bookings: ${bookings.length}`);
  console.log(`   - Reviews: ${reviews.length}`);
  console.log(`   - Notifications: 20`);
  console.log(`   - Sliders: 3`);
  console.log(`   - Onboarding Slides: 3`);
  console.log('\n🔑 Login Credentials:');
  console.log('   Admin: admin@farah.com / admin123');
  console.log('   Customer: customer1@farah.com (no password - use OTP)');
  console.log('   Provider (vendor): provider1@farah.com … provider5@farah.com / provider123');
  console.log('   Each provider has: VendorProfile, Wallet, 2 Locations, VendorServices, 4 Orders, Transactions');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
