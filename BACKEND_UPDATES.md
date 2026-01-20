# تحديثات Backend - نظام الصلاحيات والإدارة

## نظرة عامة

تم تحديث الـ backend ليشمل:
- ✅ نظام صلاحيات متقدم (Permissions & Roles)
- ✅ Middleware للتحقق من JWT والصلاحيات
- ✅ Admin Dashboard منفصل عن frontend التطبيق
- ✅ نظام OTP محسّن مع قاعدة البيانات

## التغييرات الرئيسية

### 1. Prisma Schema

#### Models جديدة:
- **Permission**: لتخزين الصلاحيات
- **RolePermission**: ربط الصلاحيات بالأدوار
- **OTP**: إدارة أكواد التحقق

#### تحديثات على User:
- `isActive`: حالة تفعيل/تعطيل الحساب
- `lastLogin`: آخر تسجيل دخول

### 2. Authentication Middleware

**الملف**: `backend/src/middleware/auth.js`

#### Functions:
- `authenticate`: التحقق من JWT token
- `requireRole(...roles)`: التحقق من الدور المطلوب
- `requirePermission(resource, action)`: التحقق من صلاحية محددة
- `optionalAuth`: مصادقة اختيارية

#### الاستخدام:
```javascript
const { authenticate, requireRole } = require('../middleware/auth');

// Require authentication
router.use(authenticate);

// Require admin role
router.use(requireRole('ADMIN'));
```

### 3. Permissions System

**الملف**: `backend/src/middleware/permissions.js`

#### الصلاحيات المتاحة:
- `USERS_*`: إدارة المستخدمين
- `VENUES_*`: إدارة القاعات
- `SERVICES_*`: إدارة الخدمات
- `BOOKINGS_*`: إدارة الحجوزات
- `CATEGORIES_*`: إدارة الفئات
- `REVIEWS_*`: إدارة التقييمات
- `PAYMENTS_*`: إدارة المدفوعات
- `ADMIN_*`: صلاحيات الإدارة

#### الأدوار والصلاحيات:
- **ADMIN**: جميع الصلاحيات
- **PROVIDER**: إدارة القاعات والخدمات الخاصة به
- **CUSTOMER**: عرض وإنشاء الحجوزات

### 4. Admin Routes

**الملف**: `backend/src/routes/admin.js`

#### Routes الجديدة:
- `PATCH /api/admin/users/:id` - تحديث مستخدم
- `DELETE /api/admin/users/:id` - حذف مستخدم
- `GET /api/admin/permissions` - قائمة الصلاحيات
- `GET /api/admin/roles/:role/permissions` - صلاحيات دور معين

#### الحماية:
جميع routes محمية بـ:
- `authenticate` middleware
- `requireRole('ADMIN')` middleware

### 5. Admin Dashboard

**المجلد**: `backend/admin/`

#### الملفات:
- `login.html`: صفحة تسجيل الدخول
- `dashboard.html`: لوحة التحكم الرئيسية
- `README.md`: توثيق لوحة التحكم

#### المميزات:
- واجهة عربية كاملة
- إحصائيات شاملة
- إدارة المستخدمين، القاعات، الخدمات، والحجوزات
- نظام authentication كامل

### 6. OTP System

تم تحسين نظام OTP:
- تخزين OTP في قاعدة البيانات
- التحقق من انتهاء الصلاحية
- منع استخدام OTP المستخدم مسبقاً
- ربط OTP بالمستخدمين

## الإعداد والتشغيل

### 1. تحديث قاعدة البيانات

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 2. تهيئة الصلاحيات

```bash
# Initialize permissions in database
npm run init:permissions
```

### 3. تشغيل الـ Server

```bash
# Development
npm run dev

# Production
npm start
```

### 4. الوصول إلى Admin Dashboard

1. افتح المتصفح على: `http://localhost:5000/admin/login.html`
2. سجل الدخول بحساب admin

## إنشاء حساب Admin

### طريقة 1: من خلال Database

```sql
UPDATE users SET role = 'ADMIN' WHERE phone = 'YOUR_PHONE';
```

### طريقة 2: من خلال Seed Script

قم بتحديث `prisma/seed.js` لإضافة admin user:

```javascript
await prisma.user.upsert({
  where: { phone: 'YOUR_PHONE' },
  update: { role: 'ADMIN' },
  create: {
    phone: 'YOUR_PHONE',
    name: 'Admin User',
    role: 'ADMIN',
    password: await bcrypt.hash('YOUR_PASSWORD', 10)
  }
});
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - تسجيل الدخول
- `POST /api/auth/otp/send` - إرسال OTP
- `POST /api/auth/otp/verify` - التحقق من OTP

### Admin (محمية)
- `GET /api/admin/stats` - الإحصائيات
- `GET /api/admin/users` - قائمة المستخدمين
- `PATCH /api/admin/users/:id` - تحديث مستخدم
- `DELETE /api/admin/users/:id` - حذف مستخدم
- `GET /api/admin/venues` - قائمة القاعات
- `PATCH /api/admin/venues/:id/status` - تحديث حالة قاعة
- `DELETE /api/admin/venues/:id` - حذف قاعة
- `GET /api/admin/services` - قائمة الخدمات
- `PATCH /api/admin/services/:id/status` - تحديث حالة خدمة
- `DELETE /api/admin/services/:id` - حذف خدمة
- `GET /api/admin/bookings` - قائمة الحجوزات
- `PATCH /api/admin/bookings/:id/status` - تحديث حالة حجز
- `GET /api/admin/permissions` - قائمة الصلاحيات
- `GET /api/admin/roles/:role/permissions` - صلاحيات دور

## الأمان

### JWT Token
- جميع طلبات Admin تتطلب Bearer token
- Token صالح لمدة 7 أيام
- يتم التحقق من صلاحية Token في كل طلب

### Role-Based Access Control
- التحقق من الدور قبل الوصول للـ routes
- Admin فقط يمكنه الوصول لـ `/api/admin/*`
- يمكن تخصيص الصلاحيات لكل دور

## ملاحظات مهمة

1. **Environment Variables**:
   - تأكد من تعيين `JWT_SECRET` في `.env`
   - تأكد من صحة `DATABASE_URL`

2. **Permissions**:
   - قم بتشغيل `npm run init:permissions` بعد أول migration
   - يمكن إعادة تشغيله بأمان (upsert)

3. **Admin Dashboard**:
   - يعمل على نفس الـ server (port 5000)
   - منفصل تماماً عن frontend التطبيق
   - يمكن نشره على subdomain منفصل

4. **OTP**:
   - في production، قم بإضافة SMS/WhatsApp service
   - حالياً يتم طباعة OTP في console للـ development

## الخطوات التالية

- [ ] إضافة SMS service لإرسال OTP
- [ ] إضافة logging system
- [ ] إضافة rate limiting
- [ ] إضافة audit trail
- [ ] تحسين error handling
- [ ] إضافة tests
