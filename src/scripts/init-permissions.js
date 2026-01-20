const { PrismaClient } = require('@prisma/client');
const { initializePermissions } = require('../middleware/permissions');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🚀 Initializing permissions...');
    await initializePermissions();
    console.log('✅ Permissions initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing permissions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

