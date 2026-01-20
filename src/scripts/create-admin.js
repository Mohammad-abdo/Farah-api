const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔧 Creating admin user...');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@farah.com' },
    });

    if (existingAdmin) {
      console.log('⚠️ Admin user already exists!');
      console.log('   Email: admin@farah.com');
      console.log('   To reset password, delete the user first or update it manually.');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: 'مدير النظام',
        email: 'admin@farah.com',
        phone: '+201000000000',
        password: hashedPassword,
        location: 'القاهرة',
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Email: admin@farah.com');
    console.log('   Password: admin123');
    console.log('\n💡 You can now login to the admin dashboard using these credentials.');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    if (error.code === 'P2002') {
      console.error('💡 Admin user with this email already exists!');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();


