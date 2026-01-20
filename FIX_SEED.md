# Fix Seed Script Error

## Problem
Error: `Cannot read properties of undefined (reading 'deleteMany')`

## Solution

### Step 1: Generate Prisma Client
```bash
npm run prisma:generate
```

If you get "EPERM" error:
1. Close all terminals
2. Close Prisma Studio if running
3. Stop backend server
4. Try again:
```bash
npm run prisma:generate
```

### Step 2: Run Migrations (if not done)
```bash
npm run prisma:migrate
```

### Step 3: Run Seed
```bash
npm run seed
```

## Alternative: Manual Fix

If Prisma Client generation keeps failing:

1. Delete Prisma cache:
   ```bash
   # Windows PowerShell
   Remove-Item -Recurse -Force node_modules\.prisma
   ```

2. Regenerate:
   ```bash
   npm run prisma:generate
   ```

3. Run seed:
   ```bash
   npm run seed
   ```

## Verify Prisma Client

Check if Prisma Client exists:
```bash
# Should show Prisma Client files
dir node_modules\.prisma\client
```

If empty or missing, run:
```bash
npm run prisma:generate
```



