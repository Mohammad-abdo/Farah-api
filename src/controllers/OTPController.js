const getPrisma = require('../utils/prisma');
const jwt = require('jsonwebtoken');
const { ValidationError, UnauthorizedError, NotFoundError } = require('../utils/errors');
const smsService = require('../services/SMSService');
const logger = require('../utils/logger');

const prisma = getPrisma();

class OTPController {
  /**
   * Send OTP
   */
  static async sendOTP(req, res, next) {
    try {
      const { phone } = req.body;

      if (!phone) {
        throw new ValidationError('Phone number is required');
      }

      // Find user if exists (optional - allow sending OTP for registration too)
      const user = await prisma.user.findUnique({
        where: { phone },
      });

      // Generate 6-digit OTP - Fixed for development: 123456
      // In production, use: Math.floor(100000 + Math.random() * 900000).toString()
      const otp = '123456';
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Delete old OTPs for this phone (expired or used)
      try {
        if (prisma.otp && typeof prisma.otp.deleteMany === 'function') {
          await prisma.otp.deleteMany({
            where: {
              phone,
              OR: [
                { expiresAt: { lt: new Date() } },
                { used: true },
              ],
            },
          });
        }
      } catch (error) {
        console.warn('Error deleting old OTPs:', error.message);
      }

      // Store OTP in database
      try {
        if (prisma.otp && typeof prisma.otp.create === 'function') {
          await prisma.otp.create({
            data: {
              phone,
              code: otp,
              expiresAt,
              userId: user?.id || null,
              used: false,
            },
          });
          console.log(`✅ OTP saved to database for ${phone}: ${otp}`);
        } else {
          console.warn('⚠️ Prisma OTP model not available, skipping database save');
        }
      } catch (error) {
        console.error('❌ Error saving OTP to database:', error);
        // Continue anyway - OTP will still work with static check
      }

      // In production, send OTP via SMS
      try {
        await smsService.sendOTP(phone, otp);
        logger.info('OTP sent via SMS', { phone });
      } catch (smsError) {
        logger.warn('Failed to send SMS, OTP logged to console', { phone, error: smsError.message });
      }

      // Also log to console for development
      console.log(`OTP for ${phone}: ${otp}`);

      res.json({
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 300, // 5 minutes in seconds
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(req, res, next) {
    try {
      const { phone, otp, isRegistration, formData } = req.body;

      if (!phone || !otp) {
        throw new ValidationError('Phone and OTP are required');
      }

      // Find valid OTP from database
      let otpRecord = null;
      try {
        if (prisma.otp && typeof prisma.otp.findFirst === 'function') {
          otpRecord = await prisma.otp.findFirst({
            where: {
              phone,
              code: otp,
              used: false,
              expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
          });
        }
      } catch (error) {
        console.error('Error finding OTP in database:', error);
      }

      // For development: Accept static OTP 123456 even if not in database
      const isStaticOTP = otp === '123456';

      if (!otpRecord && !isStaticOTP) {
        // Log for debugging
        console.log(`❌ OTP verification failed for ${phone}:`, {
          otpProvided: otp,
          otpRecordFound: !!otpRecord,
          isStaticOTP,
        });

        // Check if OTP exists but is expired or used
        let expiredOrUsedOTP = null;
        try {
          if (prisma.otp && typeof prisma.otp.findFirst === 'function') {
            expiredOrUsedOTP = await prisma.otp.findFirst({
              where: {
                phone,
                code: otp,
              },
              orderBy: { createdAt: 'desc' },
            });
          }
        } catch (error) {
          console.error('Error checking for expired/used OTP:', error);
        }

        if (expiredOrUsedOTP) {
          if (expiredOrUsedOTP.used) {
            throw new UnauthorizedError('This OTP has already been used. Please request a new one.');
          }
          if (expiredOrUsedOTP.expiresAt <= new Date()) {
            throw new UnauthorizedError('OTP has expired. Please request a new one.');
          }
        }

        throw new UnauthorizedError('Invalid OTP. Please check the code and try again.');
      }

      // Mark OTP as used if found in database
      if (otpRecord) {
        try {
          if (prisma.otp && typeof prisma.otp.update === 'function') {
            await prisma.otp.update({
              where: { id: otpRecord.id },
              data: { used: true },
            });
            console.log(`✅ OTP marked as used in database for ${phone}`);
          }
        } catch (error) {
          console.error('Error marking OTP as used:', error);
        }
      } else if (isStaticOTP) {
        // For static OTP, log it (not in database)
        console.log(`⚠️ Static OTP verified for ${phone}: ${otp} (not in database)`);
      }

      // Find user or create if doesn't exist (for registration flow)
      let user = await prisma.user.findUnique({
        where: { phone },
      });

      // If user doesn't exist and registration data provided, create user
      if (!user && isRegistration) {
        const { name, nameAr, email, locationAr } = req.body;
        
        // Validation - at least one name is required
        if (!name && !nameAr) {
          throw new ValidationError('Name (Arabic or English) is required for registration');
        }

        // Ensure at least one name is provided
        const finalName = name || nameAr || `User ${phone.slice(-4)}`;
        const finalNameAr = nameAr || name || `مستخدم ${phone.slice(-4)}`;

        // Create user
        user = await prisma.user.create({
          data: {
            name: finalName,
            nameAr: finalNameAr,
            phone,
            email: email || null,
            location: locationAr || null,
            locationAr: locationAr || null,
            role: 'CUSTOMER',
          },
          select: {
            id: true,
            name: true,
            nameAr: true,
            phone: true,
            email: true,
            location: true,
            locationAr: true,
            role: true,
            avatar: true,
            isActive: true,
            createdAt: true,
          },
        });
        console.log(`✅ User created during OTP verification for phone: ${phone}`);
      }

      // If user still doesn't exist, throw error
      if (!user) {
        throw new UnauthorizedError('User not found. Please register first.');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Generate token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      // Log avatar info for debugging
      console.log('OTP Login - User data:', {
        userId: user.id,
        hasAvatar: !!user.avatar,
        avatarLength: user.avatar?.length || 0,
        avatarPreview: user.avatar ? user.avatar.substring(0, 100) : 'No avatar',
      });

      const userData = {
        id: user.id,
        name: user.name,
        nameAr: user.nameAr,
        phone: user.phone,
        email: user.email,
        location: user.location,
        locationAr: user.locationAr,
        role: user.role,
        avatar: user.avatar || null, // Explicitly include avatar even if null
        isActive: user.isActive,
      };

      res.json({
        success: true,
        user: userData,
        token,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OTPController;



