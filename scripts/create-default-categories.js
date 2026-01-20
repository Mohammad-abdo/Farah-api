/**
 * Script to create default categories for Food Providers and Photographers
 * Run with: node scripts/create-default-categories.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDefaultCategories() {
  try {
    // Check if categories already exist
    const existingFoodProvider = await prisma.category.findFirst({
      where: {
        OR: [
          { name: 'Food Providers' },
          { nameAr: 'مقدمي الطعام' },
        ],
      },
    });

    const existingPhotographer = await prisma.category.findFirst({
      where: {
        OR: [
          { name: 'Photographers' },
          { nameAr: 'المصورين' },
        ],
      },
    });

    // Create Food Providers category if it doesn't exist
    if (!existingFoodProvider) {
      const foodProviderCategory = await prisma.category.create({
        data: {
          name: 'Food Providers',
          nameAr: 'مقدمي الطعام',
          description: 'Catering services and food providers',
        },
      });
      console.log('✅ Created Food Providers category:', foodProviderCategory.id);
    } else {
      console.log('ℹ️  Food Providers category already exists');
    }

    // Create Photographers category if it doesn't exist
    if (!existingPhotographer) {
      const photographerCategory = await prisma.category.create({
        data: {
          name: 'Photographers',
          nameAr: 'المصورين',
          description: 'Professional photography services',
        },
      });
      console.log('✅ Created Photographers category:', photographerCategory.id);
    } else {
      console.log('ℹ️  Photographers category already exists');
    }

    console.log('\n✅ Default categories setup completed!');
  } catch (error) {
    console.error('❌ Error creating categories:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createDefaultCategories();

