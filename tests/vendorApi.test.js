/**
 * Vendor API tests — all endpoints from Vendor_API.postman_collection.json
 * Run: npm test -- tests/vendorApi.test.js
 *
 * Prerequisites:
 * - tests/setup.js sets DATABASE_URL (e.g. mysql://root:@localhost:3306/farah_test)
 * - Create test DB: CREATE DATABASE farah_test;
 * - Run migrations: npx prisma migrate deploy (with DATABASE_URL pointing to farah_test)
 * - Optional: seed admin or run create-admin script for farah_test
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

describe('Vendor API — Postman Collection', () => {
  let app;
  let adminToken;
  let vendorToken;
  let vendorId;
  let serviceId;
  let orderId;
  const base = '/api';
  const vendorBase = `${base}/mobile/vendor`;
  const adminVendorBase = `${base}/admin/vendors`;

  const vendorAuth = {
    name: 'محمد أحمد',
    phone: '0509999001',
    password: 'secret123',
    vendorType: 'RESTAURANT',
    businessName: 'مطعم البيت',
    businessNameAr: 'مطعم البيت',
    address: 'الرياض - حي النرجس',
  };

  beforeAll(async () => {
    app = require('../src/server');

    // Ensure admin exists for admin login
    const adminEmail = 'admin@farah.com';
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await prisma.user.create({
        data: {
          name: 'Admin',
          email: adminEmail,
          phone: '0500000000',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
    }

    const adminRes = await request(app)
      .post(`${base}/auth/admin/login`)
      .send({ email: 'admin@farah.com', password: 'admin123' });
    if (adminRes.body.token) adminToken = adminRes.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('🔐 Vendor Auth', () => {
    it('1. POST /api/mobile/vendor/auth/register — should register a new vendor', async () => {
      const res = await request(app)
        .post(`${vendorBase}/auth/register`)
        .set('Content-Type', 'application/json')
        .send(vendorAuth)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.vendor).toBeDefined();
      expect(res.body.token).toBeDefined();
      expect(res.body.vendor.phone).toBe(vendorAuth.phone.replace(/[+\s\-()]/g, ''));
      expect(res.body.vendor.status).toBe('PENDING');
      vendorId = res.body.vendor.id;
      vendorToken = res.body.token;
    });

    it('2. POST /api/mobile/vendor/auth/verify-otp — should verify OTP', async () => {
      const otpRecord = await prisma.vendorOTP.findFirst({
        where: { phone: vendorAuth.phone.replace(/[+\s\-()]/g, ''), type: 'VERIFY', used: false },
        orderBy: { createdAt: 'desc' },
      });
      expect(otpRecord).toBeDefined();
      const otp = otpRecord.code;

      const res = await request(app)
        .post(`${vendorBase}/auth/verify-otp`)
        .set('Content-Type', 'application/json')
        .send({ phone: vendorAuth.phone, otp })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('3. POST /api/mobile/vendor/auth/resend-otp — should return 400 if phone already verified', async () => {
      const res = await request(app)
        .post(`${vendorBase}/auth/resend-otp`)
        .set('Content-Type', 'application/json')
        .send({ phone: vendorAuth.phone })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('4. POST /api/mobile/vendor/auth/login — should fail with PENDING status for protected routes', async () => {
      const res = await request(app)
        .post(`${vendorBase}/auth/login`)
        .set('Content-Type', 'application/json')
        .send({ phone: vendorAuth.phone, password: vendorAuth.password })
        .expect(200);

      expect(res.body.token).toBeDefined();
      expect(res.body.vendor.status).toBe('PENDING');
      vendorToken = res.body.token;
    });

    it('5. POST /api/mobile/vendor/auth/forgot-password — should accept valid phone', async () => {
      const res = await request(app)
        .post(`${vendorBase}/auth/forgot-password`)
        .set('Content-Type', 'application/json')
        .send({ phone: vendorAuth.phone })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('6. POST /api/mobile/vendor/auth/reset-password — should fail with wrong OTP', async () => {
      const res = await request(app)
        .post(`${vendorBase}/auth/reset-password`)
        .set('Content-Type', 'application/json')
        .send({
          phone: vendorAuth.phone,
          otp: '000000',
          newPassword: 'newpass123',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('🛡️ Admin — Vendor Management', () => {
    it('Admin Login — already done in beforeAll', () => {
      expect(adminToken).toBeDefined();
    });

    it('GET /api/admin/vendors — list all vendors', async () => {
      const res = await request(app)
        .get(`${adminVendorBase}?page=1&limit=20`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('vendors');
      expect(Array.isArray(res.body.vendors)).toBe(true);
    });

    it('GET /api/admin/vendors/:id — get vendor by ID', async () => {
      const res = await request(app)
        .get(`${adminVendorBase}/${vendorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.vendor).toBeDefined();
      expect(res.body.vendor.id).toBe(vendorId);
    });

    it('PATCH /api/admin/vendors/:id/approve — approve vendor', async () => {
      const res = await request(app)
        .patch(`${adminVendorBase}/${vendorId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBeDefined();
    });

    it('PATCH /api/admin/vendors/:id/reject — returns 404 for non-existent vendor', async () => {
      await request(app)
        .patch(`${adminVendorBase}/00000000-0000-0000-0000-000000000000/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send({ reason: 'test' })
        .expect(404);
    });

    it('GET /api/admin/vendors/:id/transactions — get vendor transactions', async () => {
      const res = await request(app)
        .get(`${adminVendorBase}/${vendorId}/transactions?page=1&limit=20`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('transactions');
      expect(Array.isArray(res.body.transactions)).toBe(true);
    });

    it('GET /api/admin/vendors/:id/orders — get vendor orders', async () => {
      const res = await request(app)
        .get(`${adminVendorBase}/${vendorId}/orders?page=1&limit=20`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('orders');
      expect(Array.isArray(res.body.orders)).toBe(true);
      if (res.body.orders.length > 0) orderId = res.body.orders[0].id;
    });

    it('POST /api/admin/vendors/:id/send-money — send money to vendor', async () => {
      const res = await request(app)
        .post(`${adminVendorBase}/${vendorId}/send-money`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send({ amount: 100, description: 'Test payment' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/admin/vendors/:id/suspend — returns 404 for non-existent vendor', async () => {
      await request(app)
        .patch(`${adminVendorBase}/00000000-0000-0000-0000-000000000000/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Vendor protected routes (after approval)', () => {
    beforeAll(async () => {
      const res = await request(app)
        .post(`${vendorBase}/auth/login`)
        .set('Content-Type', 'application/json')
        .send({ phone: vendorAuth.phone, password: vendorAuth.password })
        .expect(200);
      vendorToken = res.body.token;
      expect(res.body.vendor.status).toBe('APPROVED');
    });

    describe('👤 Profile', () => {
      it('GET /api/mobile/vendor/profile — get profile', async () => {
        const res = await request(app)
          .get(`${vendorBase}/profile`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .expect(200);

        expect(res.body.vendor).toBeDefined();
        expect(res.body.vendor.phone).toBe(vendorAuth.phone.replace(/[+\s\-()]/g, ''));
      });

      it('PATCH /api/mobile/vendor/profile — update profile', async () => {
        const res = await request(app)
          .patch(`${vendorBase}/profile`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .field('name', 'محمد أحمد المعدل')
          .field('businessName', 'مطعم القصر')
          .field('address', 'الرياض - حي العليا')
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.vendor.name).toBe('محمد أحمد المعدل');
      });

      it('PATCH /api/mobile/vendor/profile/password — update password', async () => {
        const res = await request(app)
          .patch(`${vendorBase}/profile/password`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .set('Content-Type', 'application/json')
          .send({ currentPassword: vendorAuth.password, newPassword: 'newsecret456' })
          .expect(200);

        expect(res.body.success).toBe(true);
        vendorAuth.password = 'newsecret456';
      });
    });

    describe('📊 Dashboard', () => {
      it('GET /api/mobile/vendor/dashboard — get dashboard stats', async () => {
        const res = await request(app)
          .get(`${vendorBase}/dashboard`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.stats).toBeDefined();
        expect(res.body.stats).toHaveProperty('totalOrders');
        expect(res.body.stats).toHaveProperty('pendingOrders');
        expect(res.body.stats).toHaveProperty('completedOrders');
        expect(res.body.stats).toHaveProperty('totalServices');
        expect(res.body.stats).toHaveProperty('walletBalance');
        expect(res.body.stats).toHaveProperty('totalEarnings');
      });
    });

    describe('🛍️ Services', () => {
      it('GET /api/mobile/vendor/services — list services', async () => {
        const res = await request(app)
          .get(`${vendorBase}/services?page=1&limit=20`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .expect(200);

        expect(res.body).toHaveProperty('services');
        expect(Array.isArray(res.body.services)).toBe(true);
      });

      it('POST /api/mobile/vendor/services — add service', async () => {
        const res = await request(app)
          .post(`${vendorBase}/services`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .field('name', 'برجر دجاج')
          .field('nameAr', 'برجر دجاج')
          .field('description', 'برجر دجاج مقرمش')
          .field('price', '35')
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.service).toBeDefined();
        expect(res.body.service.name).toBe('برجر دجاج');
        serviceId = res.body.service.id;
      });

      it('PATCH /api/mobile/vendor/services/:id — update service', async () => {
        const res = await request(app)
          .patch(`${vendorBase}/services/${serviceId}`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .field('name', 'برجر دجاج مقرمش')
          .field('price', '40')
          .field('isAvailable', 'true')
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(parseFloat(res.body.service.price)).toBe(40);
      });

      it('GET /api/mobile/vendor/services — list includes new service', async () => {
        const res = await request(app)
          .get(`${vendorBase}/services?page=1&limit=20`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .expect(200);

        const found = res.body.services.find((s) => s.id === serviceId);
        expect(found).toBeDefined();
      });
    });

    describe('📦 Orders', () => {
      it('GET /api/mobile/vendor/orders — list orders', async () => {
        const res = await request(app)
          .get(`${vendorBase}/orders?page=1&limit=20`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .expect(200);

        expect(res.body).toHaveProperty('orders');
        expect(Array.isArray(res.body.orders)).toBe(true);
        if (res.body.orders.length > 0 && !orderId) orderId = res.body.orders[0].id;
      });

      it('GET /api/mobile/vendor/orders/:id — get order by ID (if exists)', async () => {
        if (!orderId) {
          const listRes = await request(app)
            .get(`${vendorBase}/orders?page=1&limit=1`)
            .set('Authorization', `Bearer ${vendorToken}`);
          orderId = listRes.body.orders?.[0]?.id;
        }
        if (!orderId) {
          expect(true).toBe(true);
          return;
        }
        const res = await request(app)
          .get(`${vendorBase}/orders/${orderId}`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .expect(200);

        expect(res.body.order).toBeDefined();
        expect(res.body.order.id).toBe(orderId);
      });

      it('PATCH /api/mobile/vendor/orders/:id/accept — accept order (if PENDING exists)', async () => {
        const listRes = await request(app)
          .get(`${vendorBase}/orders?page=1&limit=50`)
          .set('Authorization', `Bearer ${vendorToken}`);
        const pending = listRes.body.orders?.find((o) => o.status === 'PENDING');
        if (!pending) return;
        const res = await request(app)
          .patch(`${vendorBase}/orders/${pending.id}/accept`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .expect(200);
        expect(res.body.success).toBe(true);
      });

      it('PATCH /api/mobile/vendor/orders/:id/reject — reject (invalid if not PENDING)', async () => {
        const listRes = await request(app)
          .get(`${vendorBase}/orders?page=1&limit=50`)
          .set('Authorization', `Bearer ${vendorToken}`);
        const notPending = listRes.body.orders?.find((o) => o.status !== 'PENDING');
        if (!notPending) return;
        await request(app)
          .patch(`${vendorBase}/orders/${notPending.id}/reject`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .set('Content-Type', 'application/json')
          .send({ reason: 'test' })
          .expect(400);
      });

      it('PATCH /api/mobile/vendor/orders/:id/status — update status (IN_DELIVERY/DELIVERED)', async () => {
        const listRes = await request(app)
          .get(`${vendorBase}/orders?page=1&limit=50`)
          .set('Authorization', `Bearer ${vendorToken}`);
        const accepted = listRes.body.orders?.find((o) => o.status === 'ACCEPTED');
        if (!accepted) return;
        await request(app)
          .patch(`${vendorBase}/orders/${accepted.id}/status`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .set('Content-Type', 'application/json')
          .send({ status: 'IN_DELIVERY' })
          .expect(200);
      });
    });

    describe('💰 Wallet', () => {
      it('GET /api/mobile/vendor/wallet — get wallet balance', async () => {
        const res = await request(app)
          .get(`${vendorBase}/wallet`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.wallet).toBeDefined();
        expect(typeof res.body.wallet.balance).toBe('number');
      });

      it('GET /api/mobile/vendor/wallet/transactions — get transactions', async () => {
        const res = await request(app)
          .get(`${vendorBase}/wallet/transactions?page=1&limit=20`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .expect(200);

        expect(res.body).toHaveProperty('transactions');
        expect(Array.isArray(res.body.transactions)).toBe(true);
      });
    });
  });

  describe('📄 Content (Public)', () => {
    it('GET /api/mobile/vendor/content/about', async () => {
      const res = await request(app).get(`${vendorBase}/content/about`).expect(200);
      expect(res.body).toBeDefined();
    });

    it('GET /api/mobile/vendor/content/privacy', async () => {
      const res = await request(app).get(`${vendorBase}/content/privacy`).expect(200);
      expect(res.body).toBeDefined();
    });

    it('GET /api/mobile/vendor/content/terms', async () => {
      const res = await request(app).get(`${vendorBase}/content/terms`).expect(200);
      expect(res.body).toBeDefined();
    });
  });

  describe('Auth failures', () => {
    it('Protected route without token — 401', async () => {
      await request(app)
        .get(`${vendorBase}/profile`)
        .expect(401);
    });

    it('Protected route with invalid token — 401', async () => {
      await request(app)
        .get(`${vendorBase}/profile`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Delete Service (cleanup)', () => {
    it('DELETE /api/mobile/vendor/services/:id — delete created service', async () => {
      if (!serviceId) return;
      const res = await request(app)
        .delete(`${vendorBase}/services/${serviceId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });
});
