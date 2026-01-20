# Database Seeding Guide

## What is Seeding?

Seeding populates your database with initial sample data for development and testing.

## Seed Data Included

The seed script creates:

- **3 Users**: 1 customer, 2 providers
- **3 Categories**: قاعات (Venues), تقديم طعام (Catering), مصورين (Photography)
- **3 Venues**: Sample wedding venues with Arabic names
- **3 Services**: Photography, catering, and video production services
- **3 Bookings**: Sample bookings with different statuses
- **2 Reviews**: Customer reviews for venues and services
- **2 Payments**: Payment records for completed bookings

## How to Run Seeds

### Step 1: Make sure migrations are done
```bash
npm run prisma:migrate
```

### Step 2: Run the seed script
```bash
npm run seed
```

Or using Prisma directly:
```bash
npx prisma db seed
```

## Expected Output

```
🌱 Starting database seed...
🧹 Cleaning existing data...
👤 Creating users...
📁 Creating categories...
🏛️ Creating venues...
🎯 Creating services...
📅 Creating bookings...
⭐ Creating reviews...
💳 Creating payments...
✅ Database seed completed successfully!

📊 Summary:
   - Users: 3
   - Categories: 3
   - Venues: 3
   - Services: 3
   - Bookings: 3
   - Reviews: 2
   - Payments: 2
```

## Important Notes

⚠️ **Warning**: The seed script will **delete all existing data** before seeding. This ensures a clean state.

If you want to keep existing data, edit `prisma/seed.js` and comment out the deletion section:

```javascript
// Comment out these lines to keep existing data:
// await prisma.payment.deleteMany()
// await prisma.bookingService.deleteMany()
// ... etc
```

## Customizing Seed Data

Edit `prisma/seed.js` to:
- Add more sample data
- Change existing data
- Add different categories/services
- Modify user information

## Resetting Database

To completely reset and reseed:

```bash
# Reset database (drops all tables)
npx prisma migrate reset

# This will automatically run seeds after reset
```

Or manually:
```bash
npm run prisma:migrate
npm run seed
```

## Viewing Seeded Data

Use Prisma Studio to view your seeded data:

```bash
npm run prisma:studio
```

This opens a web interface at `http://localhost:5555` where you can browse all your data.




