# MySQL Connection Troubleshooting

## Current Error
```
Error: P1000: Authentication failed against database server at `localhost`, the provided database credentials for `root` are not valid.
```

This means your MySQL username/password in `.env` is incorrect.

## Step 1: Check Your Current .env File

Open `backend/.env` and check the `DATABASE_URL` line. It should look like one of these:

### Option 1: With Password
```
DATABASE_URL="mysql://root:your_password@localhost:3306/farah_db"
```

### Option 2: Without Password (if MySQL has no password)
```
DATABASE_URL="mysql://root@localhost:3306/farah_db"
```

### Option 3: Different User
```
DATABASE_URL="mysql://username:password@localhost:3306/farah_db"
```

## Step 2: Test MySQL Connection

Try connecting to MySQL manually to verify your credentials:

### Windows Command Prompt:
```cmd
mysql -u root -p
```
(It will ask for password - enter your MySQL root password)

### If that doesn't work, try:
```cmd
mysql -u root
```
(If MySQL has no password)

## Step 3: Common MySQL Setup Scenarios

### Scenario A: XAMPP/WAMP Installation
If you installed MySQL via XAMPP or WAMP:
- Default username: `root`
- Default password: Usually **empty** (no password)
- Try: `DATABASE_URL="mysql://root@localhost:3306/farah_db"`

### Scenario B: Standalone MySQL Installation
If you installed MySQL separately:
- You set the password during installation
- Use: `DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/farah_db"`

### Scenario C: MySQL Workbench
If you use MySQL Workbench:
1. Open MySQL Workbench
2. Check your connection settings
3. Use the same username/password in `.env`

## Step 4: Reset MySQL Password (if needed)

If you forgot your MySQL password:

### Windows (MySQL as Service):
1. Stop MySQL service
2. Start MySQL in safe mode with skip-grant-tables
3. Connect and reset password
4. Restart MySQL service

Or use MySQL Workbench to reset it through the GUI.

## Step 5: Verify Database Exists

Connect to MySQL and run:
```sql
SHOW DATABASES;
```

If `farah_db` doesn't exist, create it:
```sql
CREATE DATABASE farah_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Alternative: Use SQLite for Development

If MySQL is too complicated, we can switch to SQLite for easier development. SQLite doesn't require a separate server or authentication.

Would you like me to update the schema to use SQLite instead?




