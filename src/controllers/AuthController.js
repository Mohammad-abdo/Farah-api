const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getPrisma = require('../utils/prisma');
const { ValidationError, UnauthorizedError, NotFoundError, ForbiddenError } = require('../utils/errors');
const emailService = require('../services/EmailService');
const smsService = require('../services/SMSService');
const logger = require('../utils/logger');

const prisma = getPrisma();

class AuthController {
  /**
   * Register a new user
   */
  static async register(req, res, next) {
    try {
      let { name, phone, email, password, location, nameAr, locationAr } = req.body;

      // Trim all string values
      name = name?.trim() || ''
      nameAr = nameAr?.trim() || ''
      phone = phone?.trim() || ''
      email = email?.trim() || ''
      location = location?.trim() || ''
      locationAr = locationAr?.trim() || ''
      
      // Phone number is already cleaned by validation middleware, but ensure it's clean
      if (phone) {
        phone = phone.replace(/[+\s\-()]/g, '')
      }

      // Validation
      if (!name && !nameAr) {
        throw new ValidationError('Name (Arabic or English) is required');
      }
      if (!phone) {
        throw new ValidationError('Phone number is required');
      }

      // Check if phone number already exists
      const existingUserByPhone = await prisma.user.findUnique({
        where: { phone },
      });

      // Check if email already exists (if provided)
      let existingUserByEmail = null;
      if (email && email.trim() !== '') {
        existingUserByEmail = await prisma.user.findFirst({
          where: { email: email.trim() },
        });
      }

      // Return specific error messages
      if (existingUserByPhone && existingUserByEmail) {
        throw new ValidationError('EMAIL_AND_PHONE_EXIST');
      } else if (existingUserByPhone) {
        throw new ValidationError('PHONE_EXISTS');
      } else if (existingUserByEmail) {
        throw new ValidationError('EMAIL_EXISTS');
      }

      // Ensure at least one name is provided
      const finalName = name || nameAr || `User ${phone.slice(-4)}`;
      const finalNameAr = nameAr || name || `مستخدم ${phone.slice(-4)}`;

      // Hash password if provided
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

      // Create user
      const user = await prisma.user.create({
        data: {
          name: finalName,
          nameAr: finalNameAr,
          phone,
          email: email || null,
          password: hashedPassword,
          location: location || null,
          locationAr: locationAr || location || null,
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

      res.status(201).json({
        success: true,
        user,
        token,
      });

      // Send welcome email asynchronously (don't wait for it)
      if (user.email) {
        emailService.sendWelcomeEmail(user).catch(err => {
          logger.error('Failed to send welcome email', { userId: user.id, error: err.message });
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user (phone or email)
   */
  static async login(req, res, next) {
    try {
      const { phone, email, password } = req.body;

      // Validation
      if (!password) {
        throw new ValidationError('Password is required');
      }

      if (!phone && !email) {
        throw new ValidationError('Phone or email is required');
      }

      // Find user by phone or email
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : []),
          ],
        },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Check password
      if (user.password) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          throw new UnauthorizedError('Invalid credentials');
        }
      } else {
        throw new UnauthorizedError('Password not set. Please set a password.');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new ForbiddenError('Account is deactivated');
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

      // Return user data (without password)
      const userData = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        location: user.location,
        role: user.role,
        avatar: user.avatar,
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

  /**
   * Admin login (email and password only)
   */
  static async adminLogin(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      console.log('🔐 Admin login attempt:', { email });

      // Find user by email
      // Note: MySQL doesn't support case-insensitive mode, so we'll search directly
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        console.log('❌ User not found with email:', email);
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      console.log('✅ User found:', { id: user.id, email: user.email, role: user.role, isActive: user.isActive });

      // Check if user is admin
      if (user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin access only.'
        });
      }

      // Check password
      if (!user.password) {
        return res.status(401).json({
          success: false,
          error: 'Password not set. Please set a password.'
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log('❌ Invalid password for user:', email);
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      console.log('✅ Password validated successfully');

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated'
        });
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

      // Return user data (without password)
      const userData = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        location: user.location,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
      };

      console.log('✅ Admin login successful:', { userId: user.id, email: user.email });
      res.json({
        success: true,
        user: userData,
        token,
      });
    } catch (error) {
      console.error('❌ Admin login error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get current user
   */
  static async getMe(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          location: true,
          role: true,
          avatar: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user profile
   */
  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const { name, nameAr, email, phone, location, locationAr, avatar } = req.body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined && { name }),
          ...(nameAr !== undefined && { nameAr }),
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
          ...(location !== undefined && { location }),
          ...(locationAr !== undefined && { locationAr }),
          ...(avatar !== undefined && { avatar }),
        },
        select: {
          id: true,
          name: true,
          nameAr: true,
          email: true,
          phone: true,
          location: true,
          locationAr: true,
          avatar: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete current user account
   */
  static async deleteMe(req, res, next) {
    try {
      const userId = req.user.userId;

      // Delete user (cascade will handle related records)
      await prisma.user.delete({
        where: { id: userId },
      });

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forgot password - Send OTP for password reset
   */
  static async forgotPassword(req, res, next) {
    try {
      const { phone } = req.body;

      if (!phone) {
        throw new ValidationError('Phone number is required');
      }

      // Find user by phone
      const user = await prisma.user.findUnique({
        where: { phone },
      });

      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          success: true,
          message: 'If an account exists with this phone number, an OTP has been sent',
        });
      }

      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Delete any existing OTPs for this phone
      await prisma.oTP.deleteMany({
        where: { phone },
      });

      // Create new OTP
      await prisma.oTP.create({
        data: {
          phone,
          code: otp,
          expiresAt,
          userId: user.id,
        },
      });

      // In production, send OTP via SMS
      console.log(`Password reset OTP for ${phone}: ${otp}`);

      res.json({
        success: true,
        message: 'If an account exists with this phone number, an OTP has been sent',
        // Remove this in production:
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password - Verify OTP and set new password
   */
  static async resetPassword(req, res, next) {
    try {
      const { phone, otp, newPassword } = req.body;

      if (!phone || !otp || !newPassword) {
        throw new ValidationError('Phone, OTP, and new password are required');
      }

      if (newPassword.length < 6) {
        throw new ValidationError('Password must be at least 6 characters');
      }

      // Find valid OTP
      const otpRecord = await prisma.oTP.findFirst({
        where: {
          phone,
          code: otp,
          used: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!otpRecord) {
        throw new UnauthorizedError('Invalid or expired OTP');
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { phone },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      // Mark OTP as used
      await prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { used: true },
      });

      // Generate new token for automatic login
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Password reset successfully',
        token,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
