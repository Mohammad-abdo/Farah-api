# Fix MySQL Authentication - Step by Step

## Current Problem
```
Error: P1000: Authentication failed against database server at `localhost`, the provided database credentials for `root` are not valid.
```

## Solution Steps

### Step 1: Open your .env file
Open `backend/.env` in a text editor.

### Step 2: Check your MySQL setup

**Try these common scenarios:**

#### Scenario A: XAMPP/WAMP (Most Common)
If you installed MySQL via XAMPP or WAMP:
- Username: `root`
- Password: Usually **EMPTY** (no password)

Update `.env` to:
```env
DATABASE_URL="mysql://root@localhost:3306/farah_db"
```
(Notice: no password after `root`)

#### Scenario B: MySQL with Password
If you set a password during MySQL installation:
```env
DATABASE_URL="mysql://root:YOUR_ACTUAL_PASSWORD@localhost:3306/farah_db"
```

#### Scenario C: Different MySQL User
If you created a different MySQL user:
```env
DATABASE_URL="mysql://username:password@localhost:3306/farah_db"
```

### Step 3: Test MySQL Connection Manually

Open Command Prompt or PowerShell and try:

**Option 1: With password prompt**
```cmd
mysql -u root -p
```
Enter your password when prompted.

**Option 2: Without password (if no password set)**
```cmd
mysql -u root
```

**Option 3: Check if MySQL is running**
```cmd
net start MySQL
```
or check Windows Services for "MySQL"

### Step 4: Verify Database Exists

Once connected to MySQL, run:
```sql
SHOW DATABASES;
```

If `farah_db` doesn't exist, create it:
```sql
CREATE DATABASE farah_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 5: Common Issues

#### Issue 1: MySQL Not Running
- Open Windows Services (services.msc)
- Find "MySQL" service
- Right-click → Start

#### Issue 2: Wrong Port
If MySQL is on a different port (not 3306):
```env
DATABASE_URL="mysql://root:password@localhost:3307/farah_db"
```

#### Issue 3: Special Characters in Password
If your password has special characters, URL encode them:
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- etc.

Example:
```env
DATABASE_URL="mysql://root:my%40password@localhost:3306/farah_db"
```

### Step 6: After Fixing .env

1. Save the `.env` file
2. Run: `npm run prisma:migrate`
3. Should work now!

## Still Having Issues?

1. **Check MySQL Workbench**: If you have MySQL Workbench installed, open it and check what connection settings work there. Use the same credentials in `.env`.

2. **Reset MySQL Password**: If you forgot the password, you may need to reset it. Search for "reset MySQL root password Windows" for your specific MySQL version.

3. **Check MySQL Error Log**: Look in MySQL data directory for error logs that might give more details.

4. **Try Creating New MySQL User**: 
   ```sql
   CREATE USER 'farah_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON farah_db.* TO 'farah_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
   Then use: `DATABASE_URL="mysql://farah_user:your_password@localhost:3306/farah_db"`




