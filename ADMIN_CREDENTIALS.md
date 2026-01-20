# Admin Login Credentials

## Default Admin Account

After running `npm run seed`, you can login with:

**Email:** `admin@farah.com`  
**Password:** `admin123`

## Create Admin User Only

If you only want to create an admin user without seeding all data:

```bash
npm run create-admin
```

This will create an admin user with:
- Email: `admin@farah.com`
- Password: `admin123`
- Role: `ADMIN`

## Troubleshooting

### If login fails with "Invalid email or password":

1. **Check if admin user exists:**
   ```sql
   SELECT * FROM users WHERE email = 'admin@farah.com' AND role = 'ADMIN';
   ```

2. **Create admin user manually:**
   ```bash
   npm run create-admin
   ```

3. **Or run full seed:**
   ```bash
   npm run seed
   ```

### If you want to change admin password:

1. Update the password in `backend/src/scripts/create-admin.js`
2. Delete existing admin user from database
3. Run `npm run create-admin` again


