const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getPrisma = require('../utils/prisma');
const prisma = getPrisma();

/**
 * Generate a 6-digit OTP code (length 6). In development returns 123456 for easy testing.
 */
const generateOTP = () =>
  process.env.NODE_ENV === 'development'
    ? '123456'
    : Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Normalize OTP from request: digits only, exactly 6 characters.
 * Returns null if invalid (not 6 digits).
 */
const normalizeOTP = (value) => {
  if (value === undefined || value === null) return null;
  const digits = String(value).replace(/\D/g, '');
  return digits.length === 6 ? digits : null;
};

/**
 * Generate JWT token for vendor (userId = vendor id)
 */
const generateToken = (userId) =>
  jwt.sign({ vendorId: userId }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });

class VendorAuthController {
  /**
   * STEP 1: Register a new vendor (User with role PROVIDER + VendorProfile + VendorWallet)
   * POST /api/mobile/vendor/auth/register
   */
  static async register(req, res) {
    try {
      let { name, phone, password, vendorType, businessName, businessNameAr, address, country, city, area, latitude, longitude, googleMapsLink } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'الاسم مطلوب' });
      }
      if (!phone || !phone.trim()) {
        return res.status(400).json({ success: false, error: 'رقم الهاتف مطلوب' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, error: 'كلمة السر يجب أن تكون 6 أحرف على الأقل' });
      }
      if (!vendorType) {
        return res.status(400).json({ success: false, error: 'نوع الخدمة مطلوب' });
      }

      const validTypes = ['RESTAURANT', 'FASHION_STORE', 'SWEETS_SHOP', 'HEADPHONES_RENTAL'];
      if (!validTypes.includes(vendorType)) {
        return res.status(400).json({
          success: false,
          error: 'نوع الخدمة غير صحيح',
          validTypes,
        });
      }

      phone = phone.replace(/[+\s\-()]/g, '');

      const existingUser = await prisma.user.findUnique({ where: { phone } });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'رقم الهاتف مسجل مسبقاً' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            name: name.trim(),
            phone,
            password: hashedPassword,
            role: 'PROVIDER',
            isActive: true,
          },
        });
        await tx.vendorProfile.create({
          data: {
            userId: u.id,
            vendorType,
            businessName: businessName?.trim() || null,
            businessNameAr: businessNameAr?.trim() || null,
            address: address?.trim() || null,
            country: country?.trim() || null,
            city: city?.trim() || null,
            area: area?.trim() || null,
            latitude: latitude === '' || latitude === null ? null : parseFloat(latitude),
            longitude: longitude === '' || longitude === null ? null : parseFloat(longitude),
            googleMapsLink: googleMapsLink?.trim() || null,
            status: 'PENDING',
            phoneVerified: false,
          },
        });
        await tx.vendorWallet.create({
          data: { userId: u.id },
        });
        return u;
      });

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await prisma.vendorOTP.deleteMany({ where: { phone, type: 'VERIFY' } });
      await prisma.vendorOTP.create({
        data: { phone, code: otp, type: 'VERIFY', expiresAt, userId: user.id },
      });

      console.log(`📱 [VENDOR OTP] Phone: ${phone} | Code: ${otp}`);

      const token = generateToken(user.id);
      const profile = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });

      return res.status(201).json({
        success: true,
        message: 'تم التسجيل بنجاح. تحقق من رقم الهاتف ثم انتظر موافقة الإدارة.',
        vendor: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          vendorType: profile?.vendorType,
          status: profile?.status ?? 'PENDING',
          phoneVerified: profile?.phoneVerified ?? false,
          createdAt: user.createdAt,
        },
        token,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      });
    } catch (error) {
      console.error('Vendor register error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  static async verifyOtp(req, res) {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ success: false, error: 'رقم الهاتف والكود مطلوبان' });
      }

      const cleanOtp = normalizeOTP(otp);
      if (!cleanOtp) {
        return res.status(400).json({ success: false, error: 'الكود يجب أن يكون 6 أرقام' });
      }

      const cleanPhone = phone.replace(/[+\s\-()]/g, '');
      const otpRecord = await prisma.vendorOTP.findFirst({
        where: {
          phone: cleanPhone,
          code: cleanOtp,
          type: 'VERIFY',
          used: false,
          expiresAt: { gt: new Date() },
        },
      });

      // Development: accept fixed OTP 123456 for testing
      const isDevStatic = process.env.NODE_ENV === 'development' && cleanOtp === '123456';
      const validRecord = otpRecord || (isDevStatic && (await prisma.vendorOTP.findFirst({
        where: { phone: cleanPhone, type: 'VERIFY', used: false, expiresAt: { gt: new Date() } },
      })));

      if (!validRecord) {
        return res.status(400).json({ success: false, error: 'الكود غير صحيح أو منتهي الصلاحية' });
      }

      await prisma.vendorOTP.update({ where: { id: validRecord.id }, data: { used: true } });
      const user = await prisma.user.findFirst({
        where: { phone: cleanPhone, role: 'PROVIDER' },
        include: { vendorProfile: true },
      });
      if (user?.vendorProfile) {
        await prisma.vendorProfile.update({
          where: { userId: user.id },
          data: { phoneVerified: true },
        });
      }

      return res.json({ success: true, message: 'تم التحقق من رقم الهاتف بنجاح' });
    } catch (error) {
      console.error('Vendor verifyOtp error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  static async resendOtp(req, res) {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, error: 'رقم الهاتف مطلوب' });
      }

      const cleanPhone = phone.replace(/[+\s\-()]/g, '');
      const user = await prisma.user.findFirst({
        where: { phone: cleanPhone, role: 'PROVIDER' },
        include: { vendorProfile: true },
      });
      if (!user) {
        return res.status(404).json({ success: false, error: 'الحساب غير موجود' });
      }

      if (user.vendorProfile?.phoneVerified) {
        return res.status(400).json({ success: false, error: 'رقم الهاتف محقق مسبقاً' });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await prisma.vendorOTP.deleteMany({ where: { phone: cleanPhone, type: 'VERIFY' } });
      await prisma.vendorOTP.create({
        data: { phone: cleanPhone, code: otp, type: 'VERIFY', expiresAt, userId: user.id },
      });

      console.log(`📱 [VENDOR OTP RESEND] Phone: ${cleanPhone} | Code: ${otp}`);

      return res.json({
        success: true,
        message: 'تم إرسال كود التحقق',
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      });
    } catch (error) {
      console.error('Vendor resendOtp error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  static async login(req, res) {
    try {
      let { phone, password } = req.body;
      if (!phone || !password) {
        return res.status(400).json({ success: false, error: 'رقم الهاتف وكلمة السر مطلوبان' });
      }

      phone = phone.replace(/[+\s\-()]/g, '');
      const user = await prisma.user.findFirst({
        where: { phone, role: 'PROVIDER' },
        include: { vendorProfile: true },
      });

      if (!user) {
        return res.status(401).json({ success: false, error: 'بيانات الدخول غير صحيحة' });
      }

      const isValid = await bcrypt.compare(password, user.password || '');
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'بيانات الدخول غير صحيحة' });
      }

      if (!user.isActive) {
        return res.status(403).json({ success: false, error: 'الحساب معطل' });
      }

      await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

      const token = generateToken(user.id);
      const profile = user.vendorProfile;

      return res.json({
        success: true,
        vendor: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          vendorType: profile?.vendorType,
          status: profile?.status ?? 'PENDING',
          phoneVerified: profile?.phoneVerified ?? false,
          businessName: profile?.businessName,
          avatar: profile?.avatar ?? user.avatar,
        },
        token,
        status: profile?.status ?? 'PENDING',
      });
    } catch (error) {
      console.error('Vendor login error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  static async forgotPassword(req, res) {
    try {
      let { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, error: 'رقم الهاتف مطلوب' });
      }
      phone = phone.replace(/[+\s\-()]/g, '');

      const user = await prisma.user.findFirst({
        where: { phone, role: 'PROVIDER' },
      });
      if (!user) {
        return res.json({ success: true, message: 'إذا كان الحساب موجوداً سيتم إرسال كود إعادة التعيين' });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await prisma.vendorOTP.deleteMany({ where: { phone, type: 'RESET_PASSWORD' } });
      await prisma.vendorOTP.create({
        data: { phone, code: otp, type: 'RESET_PASSWORD', expiresAt, userId: user.id },
      });

      console.log(`🔑 [VENDOR RESET OTP] Phone: ${phone} | Code: ${otp}`);

      return res.json({
        success: true,
        message: 'إذا كان الحساب موجوداً سيتم إرسال كود إعادة التعيين',
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      });
    } catch (error) {
      console.error('Vendor forgotPassword error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  static async resetPassword(req, res) {
    try {
      let { phone, otp, newPassword } = req.body;
      if (!phone || !otp || !newPassword) {
        return res.status(400).json({ success: false, error: 'جميع الحقول مطلوبة' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'كلمة السر 6 أحرف على الأقل' });
      }

      const cleanOtp = normalizeOTP(otp);
      if (!cleanOtp) {
        return res.status(400).json({ success: false, error: 'الكود يجب أن يكون 6 أرقام' });
      }

      phone = phone.replace(/[+\s\-()]/g, '');
      let otpRecord = await prisma.vendorOTP.findFirst({
        where: {
          phone,
          code: cleanOtp,
          type: 'RESET_PASSWORD',
          used: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (!otpRecord && process.env.NODE_ENV === 'development' && cleanOtp === '123456') {
        otpRecord = await prisma.vendorOTP.findFirst({
          where: { phone, type: 'RESET_PASSWORD', used: false, expiresAt: { gt: new Date() } },
        });
      }

      if (!otpRecord) {
        return res.status(400).json({ success: false, error: 'الكود غير صحيح أو منتهي الصلاحية' });
      }

      const user = await prisma.user.findFirst({
        where: { phone, role: 'PROVIDER' },
      });
      if (!user) {
        return res.status(404).json({ success: false, error: 'الحساب غير موجود' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
      await prisma.vendorOTP.update({ where: { id: otpRecord.id }, data: { used: true } });

      const token = generateToken(user.id);
      return res.json({ success: true, message: 'تم إعادة تعيين كلمة السر بنجاح', token });
    } catch (error) {
      console.error('Vendor resetPassword error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }
}

module.exports = VendorAuthController;
