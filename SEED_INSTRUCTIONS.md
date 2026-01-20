# Database Seed Instructions

## Prerequisites

1. Make sure MySQL database is running
2. Create a database (e.g., `farah_db`)
3. Update `DATABASE_URL` in `.env` file
4. Run Prisma migrations first:
   ```bash
   npm run prisma:migrate
   ```

## Running Seed

To seed the database with initial data:

```bash
npm run seed
```

Or directly:
```bash
node prisma/seed.js
```

## What Gets Created

The seed script will create:

### Users (4 total)
- **1 Admin User**
  - Phone: `+201000000000`
  - Password: `admin123`
  - Role: ADMIN

- **1 Customer User**
  - Phone: `+201234567890`
  - Password: `customer123`
  - Role: CUSTOMER

- **2 Provider Users**
  - Phone: `+201234567891`, Password: `provider123`
  - Phone: `+201234567892`, Password: `provider123`
  - Role: PROVIDER

### Categories (3)
- Venues (قاعات)
- Catering (تقديم طعام)
- Photography (مصورين)

### Venues (3)
- Pearl Hall (قاعة اللؤلؤة)
- Royal Palace (قاعة القصر الملكي)
- Garden Hall (قاعة الحديقة)

### Services (3)
- Wedding Photography (تصوير أعراس)
- Catering Service (خدمة تقديم طعام)
- Video Production (إنتاج فيديو)

### Bookings (3)
- Various booking statuses (PENDING, CONFIRMED, COMPLETED)

### Reviews (2)
- Reviews for venues and services

### Payments (2)
- Payment records for bookings

### Permissions (36)
- Full CRUD permissions for all resources:
  - Users, Venues, Services, Bookings, Categories, Reviews, Payments, Reports

### Role Permissions (36)
- All permissions assigned to ADMIN role

### OTP Records (1)
- Sample OTP for testing

### Reports (2)
- Sample reports (one completed, one pending)

## Important Notes

⚠️ **Warning**: The seed script will **DELETE ALL EXISTING DATA** before seeding. Make sure you have backups if needed.

To keep existing data, comment out the deletion section in `seed.js`:
```javascript
// await prisma.payment.deleteMany()
// await prisma.bookingService.deleteMany()
// ... etc
```

## Troubleshooting

### Error: "EPERM: operation not permitted"
- Close any applications using Prisma Client (like Prisma Studio)
- Restart your terminal
- Try running the command again

### Error: "Can't reach database server"
- Check if MySQL is running
- Verify `DATABASE_URL` in `.env` is correct
- Check database credentials

### Error: "Table doesn't exist"
- Run migrations first: `npm run prisma:migrate`
- Then run seed: `npm run seed`

## After Seeding

1. **Test Admin Login**
   - Go to: `http://localhost:3000/admin/login`
   - Use: Phone `+201000000000`, Password `admin123`

2. **Test Customer Login**
   - Go to: `http://localhost:3000/login`
   - Use: Phone `+201234567890`, Password `customer123`

3. **Verify Data**
   - Check admin dashboard for statistics
   - Browse venues, services, bookings, etc.



