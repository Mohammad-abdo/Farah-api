# Troubleshooting Guide

## Seed Script Errors

### Error: "Cannot read properties of undefined (reading 'deleteMany')"

**Cause:** Prisma Client hasn't been generated or is outdated.

**Solution:**
1. Stop any running servers (backend, Prisma Studio, etc.)
2. Run:
   ```bash
   npm run prisma:generate
   ```
3. If that fails with "EPERM" error, close all terminals and applications
4. Try again:
   ```bash
   npm run prisma:generate
   ```
5. Then run seed:
   ```bash
   npm run seed
   ```

### Error: "EPERM: operation not permitted"

**Cause:** Prisma Client files are locked by another process.

**Solution:**
1. Close Prisma Studio if running
2. Stop backend server (`npm run dev`)
3. Close all terminals
4. Restart terminal and try again
5. If still fails, delete `node_modules/.prisma` folder and regenerate:
   ```bash
   rm -rf node_modules/.prisma
   npm run prisma:generate
   ```

### Error: "Database connection failed"

**Cause:** MySQL is not running or DATABASE_URL is incorrect.

**Solution:**
1. Check if MySQL is running:
   ```bash
   # Windows
   net start MySQL80
   
   # Or check services
   services.msc
   ```

2. Verify DATABASE_URL in `.env`:
   ```
   DATABASE_URL="mysql://username:password@localhost:3306/database_name"
   ```

3. Test connection:
   ```bash
   npm run prisma:studio
   ```

### Error: "Table doesn't exist"

**Cause:** Migrations haven't been run.

**Solution:**
1. Run migrations:
   ```bash
   npm run prisma:migrate
   ```

2. Then run seed:
   ```bash
   npm run seed
   ```

## Common Issues

### Prisma Client Not Generated

**Symptoms:**
- `Cannot read properties of undefined`
- `Unknown model`
- Import errors

**Solution:**
```bash
npm run prisma:generate
```

### Database Not Connected

**Symptoms:**
- Connection timeout
- "Can't reach database server"

**Solution:**
1. Check MySQL is running
2. Verify DATABASE_URL
3. Check firewall settings
4. Verify database exists

### Seed Fails Partially

**Symptoms:**
- Some data created, some not
- Foreign key errors

**Solution:**
1. Clear database manually or run migrations reset:
   ```bash
   npm run prisma:migrate reset
   ```
2. Then run seed again:
   ```bash
   npm run seed
   ```

## Step-by-Step Setup

If nothing works, follow these steps in order:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup .env:**
   - Copy `.env.example` to `.env`
   - Update DATABASE_URL

3. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

4. **Run migrations:**
   ```bash
   npm run prisma:migrate
   ```

5. **Seed database:**
   ```bash
   npm run seed
   ```

6. **Start server:**
   ```bash
   npm run dev
   ```

## Still Having Issues?

1. Check Prisma version:
   ```bash
   npx prisma --version
   ```

2. Check Node version:
   ```bash
   node --version
   ```
   Should be Node 16+ and Prisma 5.x

3. Clear everything and start fresh:
   ```bash
   rm -rf node_modules
   rm -rf node_modules/.prisma
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run seed
   ```



