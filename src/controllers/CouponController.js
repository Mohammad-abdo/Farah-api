const getPrisma = require('../utils/prisma');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');

const prisma = getPrisma();

class CouponController {
  /**
   * Get all active coupons (for mobile app)
   * GET /api/mobile/coupons
   */
  static async getCoupons(req, res, next) {
    try {
      const userId = req.user.id;
      const now = new Date();

      // Get all active coupons
      const allCoupons = await prisma.coupon.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Filter coupons that haven't reached usage limit
      const coupons = allCoupons.filter(coupon => 
        !coupon.usageLimit || coupon.usedCount < coupon.usageLimit
      );

      // Check which coupons user has already used
      const userCouponUsage = await prisma.userCoupon.findMany({
        where: { userId },
        select: { couponId: true }
      });
      const usedCouponIds = new Set(userCouponUsage.map(uc => uc.couponId));

      // Add usage status to each coupon
      const couponsWithStatus = coupons.map(coupon => ({
        ...coupon,
        isUsed: usedCouponIds.has(coupon.id),
        canUse: !usedCouponIds.has(coupon.id)
      }));

      res.json({
        success: true,
        coupons: couponsWithStatus
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get coupon by code
   * GET /api/mobile/coupons/:code
   */
  static async getCouponByCode(req, res, next) {
    try {
      const { code } = req.params;
      const userId = req.user.id;
      const now = new Date();

      const coupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() }
      });

      if (!coupon) {
        throw new NotFoundError('Coupon not found');
      }

      // Check if coupon is valid
      if (!coupon.isActive) {
        throw new ValidationError('Coupon is not active');
      }

      if (coupon.startDate > now) {
        throw new ValidationError('Coupon has not started yet');
      }

      if (coupon.endDate < now) {
        throw new ValidationError('Coupon has expired');
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new ValidationError('Coupon usage limit reached');
      }

      // Check if user has already used this coupon
      const userCoupon = await prisma.userCoupon.findUnique({
        where: {
          userId_couponId: {
            userId,
            couponId: coupon.id
          }
        }
      });

      res.json({
        success: true,
        coupon: {
          ...coupon,
          isUsed: !!userCoupon,
          canUse: !userCoupon
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Apply/Use coupon
   * POST /api/mobile/coupons/:code/apply
   */
  static async applyCoupon(req, res, next) {
    try {
      const { code } = req.params;
      const userId = req.user.id;
      const { amount } = req.body; // Total amount before discount
      const now = new Date();

      if (!amount || amount <= 0) {
        throw new ValidationError('Amount is required');
      }

      const coupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() }
      });

      if (!coupon) {
        throw new NotFoundError('Coupon not found');
      }

      // Validate coupon
      if (!coupon.isActive) {
        throw new ValidationError('Coupon is not active');
      }

      if (coupon.startDate > now) {
        throw new ValidationError('Coupon has not started yet');
      }

      if (coupon.endDate < now) {
        throw new ValidationError('Coupon has expired');
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new ValidationError('Coupon usage limit reached');
      }

      // Check minimum amount
      if (coupon.minAmount && amount < coupon.minAmount) {
        throw new ValidationError(`Minimum purchase amount is ${coupon.minAmount}`);
      }

      // Check if user has already used this coupon
      const existingUserCoupon = await prisma.userCoupon.findUnique({
        where: {
          userId_couponId: {
            userId,
            couponId: coupon.id
          }
        }
      });

      if (existingUserCoupon) {
        throw new ValidationError('You have already used this coupon');
      }

      // Calculate discount
      let discount = 0;
      if (coupon.discountType === 'PERCENTAGE') {
        discount = (amount * coupon.discountValue) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else {
        discount = coupon.discountValue;
        if (discount > amount) {
          discount = amount;
        }
      }

      const finalAmount = amount - discount;

      // Mark coupon as used for this user
      await prisma.userCoupon.create({
        data: {
          userId,
          couponId: coupon.id
        }
      });

      // Update coupon used count
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } }
      });

      res.json({
        success: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          title: coupon.title,
          titleAr: coupon.titleAr,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discount,
          originalAmount: amount,
          finalAmount
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CouponController;

