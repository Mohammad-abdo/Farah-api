# Vendor API Tests

اختبارات لجميع نقاط نهاية (endpoints) مجموعة Postman **Vendor_API.postman_collection.json**.

## تشغيل الاختبارات

```bash
npm test -- tests/vendorApi.test.js
```

## متطلبات التشغيل

1. **قاعدة بيانات اختبار**
   - الافتراضي في `tests/setup.js`: `mysql://root:@localhost:3306/farah_test`
   - إنشاء قاعدة البيانات:
     ```sql
     CREATE DATABASE farah_test;
     ```
   - تطبيق الهجرات:
     ```bash
     DATABASE_URL="mysql://root:@localhost:3306/farah_test" npx prisma migrate deploy
     ```
   - أو نسخ بيانات من `farah_db` إن رغبت.

2. **حساب أدمن**
   - الاختبارات تنشئ أدمن تلقائياً إن لم يكن موجوداً: `admin@farah.com` / `admin123`
   - أو تشغيل: `node src/scripts/create-admin.js` مع `DATABASE_URL=...farah_test`

## التغطية (Endpoints المغطاة)

| القسم | Endpoints |
|-------|-----------|
| **Vendor Auth** | Register, Verify OTP, Resend OTP, Login, Forgot Password, Reset Password |
| **Admin** | Admin Login, List Vendors, Get Vendor, Approve, Reject, Suspend, Send Money, Transactions, Orders |
| **Profile** | Get, Update, Update Password |
| **Dashboard** | Get Stats |
| **Services** | List, Add, Update, Delete |
| **Orders** | List, Get by ID, Accept, Reject, Update Status |
| **Wallet** | Balance, Transactions |
| **Content (Public)** | About, Privacy, Terms |
| **Auth** | 401 without token, 401 invalid token |

## تغيير عنوان قاعدة الاختبار

في `tests/setup.js` يمكنك تعديل `DATABASE_URL` أو تعيين المتغير قبل التشغيل:

```bash
set DATABASE_URL=mysql://root:mypass@localhost:3306/farah_test
npm test -- tests/vendorApi.test.js
```
