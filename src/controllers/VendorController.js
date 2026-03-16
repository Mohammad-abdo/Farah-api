const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Generate a short unique order number
 */
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

class VendorController {
  // =====================================================
  // PROFILE
  // =====================================================

  /**
   * GET /api/mobile/vendor/profile
   */
  static async getProfile(req, res) {
    try {
      const user = await prisma.user.findFirst({
        where: { id: req.vendor.id, role: 'PROVIDER' },
        include: {
          vendorProfile: true,
          vendorWallet: { select: { balance: true } },
          _count: { select: { vendorServices: true, vendorOrders: true } },
        },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'الحساب غير موجود' });
      }

      const p = user.vendorProfile || {};
      const vendor = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        vendorType: p.vendorType,
        status: p.status,
        businessName: p.businessName,
        businessNameAr: p.businessNameAr,
        description: p.description,
        avatar: p.avatar,
        address: p.address,
        country: p.country,
        city: p.city,
        area: p.area,
        latitude: p.latitude,
        longitude: p.longitude,
        googleMapsLink: p.googleMapsLink,
        phoneVerified: p.phoneVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        wallet: user.vendorWallet ? { balance: user.vendorWallet.balance } : null,
        _count: { services: user._count?.vendorServices ?? 0, orders: user._count?.vendorOrders ?? 0 },
      };

      return res.json({ success: true, vendor });
    } catch (error) {
      console.error('getProfile error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * PATCH /api/mobile/vendor/profile
   */
  static async updateProfile(req, res) {
    try {
      const { name, businessName, businessNameAr, description, address, country, city, area, latitude, longitude, googleMapsLink } = req.body;

      let avatarUrl = undefined;
      if (req.file) {
        avatarUrl = `/uploads/vendors/${req.file.filename}`;
      }

      const userUpdate = {};
      const profileUpdate = {};
      if (name !== undefined) userUpdate.name = name.trim();
      if (businessName !== undefined) profileUpdate.businessName = businessName?.trim();
      if (businessNameAr !== undefined) profileUpdate.businessNameAr = businessNameAr?.trim();
      if (description !== undefined) profileUpdate.description = description;
      if (address !== undefined) profileUpdate.address = address;
      if (country !== undefined) profileUpdate.country = country?.trim() || null;
      if (city !== undefined) profileUpdate.city = city?.trim() || null;
      if (area !== undefined) profileUpdate.area = area?.trim() || null;
      if (latitude !== undefined) profileUpdate.latitude = latitude === '' || latitude === null ? null : parseFloat(latitude);
      if (longitude !== undefined) profileUpdate.longitude = longitude === '' || longitude === null ? null : parseFloat(longitude);
      if (googleMapsLink !== undefined) profileUpdate.googleMapsLink = googleMapsLink?.trim() || null;
      if (avatarUrl !== undefined) profileUpdate.avatar = avatarUrl;

      if (Object.keys(userUpdate).length > 0) {
        await prisma.user.update({ where: { id: req.vendor.id }, data: userUpdate });
      }
      if (Object.keys(profileUpdate).length > 0) {
        await prisma.vendorProfile.update({ where: { userId: req.vendor.id }, data: profileUpdate });
      }

      const user = await prisma.user.findFirst({
        where: { id: req.vendor.id, role: 'PROVIDER' },
        include: { vendorProfile: true },
      });
      const p = user.vendorProfile || {};
      const vendor = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        vendorType: p.vendorType,
        status: p.status,
        businessName: p.businessName,
        businessNameAr: p.businessNameAr,
        description: p.description,
        avatar: p.avatar,
        address: p.address,
        country: p.country,
        city: p.city,
        area: p.area,
        latitude: p.latitude,
        longitude: p.longitude,
        googleMapsLink: p.googleMapsLink,
      };

      return res.json({ success: true, vendor });
    } catch (error) {
      console.error('updateProfile error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * DELETE /api/mobile/vendor/profile
   */
  static async deleteAccount(req, res) {
    try {
      await prisma.user.delete({ where: { id: req.vendor.id } });
      return res.json({ success: true, message: 'تم حذف الحساب بنجاح' });
    } catch (error) {
      console.error('deleteAccount error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  // =====================================================
  // LOCATIONS (Branches)
  // =====================================================

  /**
   * GET /api/mobile/vendor/locations
   */
  static async getLocations(req, res) {
    try {
      const locations = await prisma.vendorLocation.findMany({
        where: { userId: req.vendor.id },
        orderBy: [{ isMainLocation: 'desc' }, { createdAt: 'asc' }],
      });
      return res.json({ success: true, locations });
    } catch (error) {
      console.error('getLocations error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * POST /api/mobile/vendor/locations
   * Body: { locationName, address?, city?, area?, latitude?, longitude?, isMainLocation? }
   */
  static async addLocation(req, res) {
    try {
      const { locationName, address, city, area, latitude, longitude, isMainLocation } = req.body;
      if (!locationName || !locationName.trim()) {
        return res.status(400).json({ success: false, error: 'اسم الفرع مطلوب' });
      }
      const data = {
        userId: req.vendor.id,
        locationName: locationName.trim(),
        address: address?.trim() || null,
        city: city?.trim() || null,
        area: area?.trim() || null,
        latitude: latitude === '' || latitude === null ? null : parseFloat(latitude),
        longitude: longitude === '' || longitude === null ? null : parseFloat(longitude),
        isMainLocation: !!isMainLocation,
      };
      if (data.isMainLocation) {
        await prisma.vendorLocation.updateMany({
          where: { userId: req.vendor.id },
          data: { isMainLocation: false },
        });
      }
      const location = await prisma.vendorLocation.create({ data });
      return res.status(201).json({ success: true, location });
    } catch (error) {
      console.error('addLocation error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * PATCH /api/mobile/vendor/locations/:id
   */
  static async updateLocation(req, res) {
    try {
      const { id } = req.params;
      const { locationName, address, city, area, latitude, longitude, isMainLocation } = req.body;
      const existing = await prisma.vendorLocation.findFirst({
        where: { id, userId: req.vendor.id },
      });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'الفرع غير موجود' });
      }
      const updateData = {};
      if (locationName !== undefined) updateData.locationName = locationName.trim();
      if (address !== undefined) updateData.address = address?.trim() || null;
      if (city !== undefined) updateData.city = city?.trim() || null;
      if (area !== undefined) updateData.area = area?.trim() || null;
      if (latitude !== undefined) updateData.latitude = latitude === '' || latitude === null ? null : parseFloat(latitude);
      if (longitude !== undefined) updateData.longitude = longitude === '' || longitude === null ? null : parseFloat(longitude);
      if (isMainLocation !== undefined) {
        updateData.isMainLocation = !!isMainLocation;
        if (updateData.isMainLocation) {
          await prisma.vendorLocation.updateMany({
            where: { userId: req.vendor.id, id: { not: id } },
            data: { isMainLocation: false },
          });
        }
      }
      const location = await prisma.vendorLocation.update({
        where: { id },
        data: updateData,
      });
      return res.json({ success: true, location });
    } catch (error) {
      console.error('updateLocation error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * DELETE /api/mobile/vendor/locations/:id
   */
  static async deleteLocation(req, res) {
    try {
      const { id } = req.params;
      const existing = await prisma.vendorLocation.findFirst({
        where: { id, userId: req.vendor.id },
      });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'الفرع غير موجود' });
      }
      await prisma.vendorLocation.delete({ where: { id } });
      return res.json({ success: true, message: 'تم حذف الفرع' });
    } catch (error) {
      console.error('deleteLocation error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  // =====================================================
  // SERVICES (Products/Menu Items)
  // =====================================================

  /**
   * GET /api/mobile/vendor/services
   */
  static async getServices(req, res) {
    try {
      const { page = 1, limit = 20, isAvailable } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = { userId: req.vendor.id };
      if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';

      const [services, total] = await Promise.all([
        prisma.vendorService.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip,
        }),
        prisma.vendorService.count({ where }),
      ]);

      return res.json({ success: true, services, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
      console.error('getServices error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * POST /api/mobile/vendor/services
   * Body: { name, nameAr?, description?, price, images?: [] }
   */
  static async addService(req, res) {
    try {
      const { name, nameAr, description, price } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'اسم الخدمة مطلوب' });
      }
      if (!price || isNaN(parseFloat(price))) {
        return res.status(400).json({ success: false, error: 'السعر مطلوب' });
      }

      // Handle uploaded images
      let images = [];
      if (req.files && req.files.length > 0) {
        images = req.files.map((f) => `/uploads/vendors/${f.filename}`);
      } else if (req.body.images) {
        images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
      }

      const service = await prisma.vendorService.create({
        data: {
          userId: req.vendor.id,
          name: name.trim(),
          nameAr: nameAr?.trim() || null,
          description: description || null,
          price: parseFloat(price),
          images,
        },
      });

      return res.status(201).json({ success: true, service });
    } catch (error) {
      console.error('addService error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * PATCH /api/mobile/vendor/services/:id
   */
  static async updateService(req, res) {
    try {
      const { id } = req.params;

      const existing = await prisma.vendorService.findUnique({ where: { id } });
      if (!existing || existing.userId !== req.vendor.id) {
        return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });
      }

      const { name, nameAr, description, price, isAvailable } = req.body;
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (nameAr !== undefined) updateData.nameAr = nameAr.trim();
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (isAvailable !== undefined) updateData.isAvailable = isAvailable === true || isAvailable === 'true';

      // Handle new images if uploaded
      if (req.files && req.files.length > 0) {
        updateData.images = req.files.map((f) => `/uploads/vendors/${f.filename}`);
      } else if (req.body.images) {
        updateData.images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
      }

      const service = await prisma.vendorService.update({ where: { id }, data: updateData });
      return res.json({ success: true, service });
    } catch (error) {
      console.error('updateService error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * DELETE /api/mobile/vendor/services/:id
   */
  static async deleteService(req, res) {
    try {
      const { id } = req.params;
      const existing = await prisma.vendorService.findUnique({ where: { id } });
      if (!existing || existing.userId !== req.vendor.id) {
        return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });
      }

      await prisma.vendorService.delete({ where: { id } });
      return res.json({ success: true, message: 'تم حذف الخدمة' });
    } catch (error) {
      console.error('deleteService error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  // =====================================================
  // ORDERS
  // =====================================================

  /**
   * GET /api/mobile/vendor/orders
   * Query: status, page, limit
   */
  static async getOrders(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = { userId: req.vendor.id };
      if (status) where.status = status.toUpperCase();

      const [orders, total] = await Promise.all([
        prisma.vendorOrder.findMany({
          where,
          include: {
            items: {
              include: {
                service: { select: { id: true, name: true, nameAr: true, price: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip,
        }),
        prisma.vendorOrder.count({ where }),
      ]);

      return res.json({ success: true, orders, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
      console.error('getOrders error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * PATCH /api/mobile/vendor/orders/:id/accept
   */
  static async acceptOrder(req, res) {
    try {
      const { id } = req.params;
      const order = await prisma.vendorOrder.findUnique({ where: { id } });
      if (!order || order.userId !== req.vendor.id) {
        return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      }

      if (order.status !== 'PENDING') {
        return res.status(400).json({ success: false, error: 'لا يمكن قبول هذا الطلب في حالته الحالية' });
      }

      const updated = await prisma.vendorOrder.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      });

      return res.json({ success: true, order: updated, message: 'تم قبول الطلب' });
    } catch (error) {
      console.error('acceptOrder error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * PATCH /api/mobile/vendor/orders/:id/reject
   * Body: { reason? }
   */
  static async rejectOrder(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const order = await prisma.vendorOrder.findUnique({ where: { id } });
      if (!order || order.userId !== req.vendor.id) {
        return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      }

      if (order.status !== 'PENDING') {
        return res.status(400).json({ success: false, error: 'لا يمكن رفض هذا الطلب في حالته الحالية' });
      }

      const updated = await prisma.vendorOrder.update({
        where: { id },
        data: {
          status: 'REJECTED',
          notes: reason ? `${order.notes || ''}\nسبب الرفض: ${reason}` : order.notes,
        },
      });

      return res.json({ success: true, order: updated, message: 'تم رفض الطلب' });
    } catch (error) {
      console.error('rejectOrder error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * PATCH /api/mobile/vendor/orders/:id/status
   * Body: { status } — allowed: IN_DELIVERY, DELIVERED, CANCELLED
   */
  static async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = ['IN_DELIVERY', 'DELIVERED', 'CANCELLED'];
      if (!status || !allowedStatuses.includes(status.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: 'حالة غير صحيحة',
          allowedStatuses,
        });
      }

      const order = await prisma.vendorOrder.findUnique({ where: { id } });
      if (!order || order.userId !== req.vendor.id) {
        return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      }

      const updated = await prisma.vendorOrder.update({
        where: { id },
        data: { status: status.toUpperCase() },
      });

      // If order delivered: apply commission, credit vendor wallet, log commission
      if (status.toUpperCase() === 'DELIVERED') {
        const settings = await prisma.appSettings.findFirst();
        const commissionType = (settings?.commissionType || 'PERCENTAGE').toUpperCase();
        const commissionValue = Number(settings?.commissionValue) || 0;
        let commissionAmount = 0;
        if (commissionType === 'PERCENTAGE' && commissionValue > 0) {
          commissionAmount = Math.round((order.totalAmount * commissionValue) / 100 * 1000) / 1000;
        } else if (commissionType === 'FIXED' && commissionValue > 0) {
          commissionAmount = Math.min(commissionValue, order.totalAmount);
        }
        const vendorEarnings = Math.round((order.totalAmount - commissionAmount) * 1000) / 1000;

        let wallet = await prisma.vendorWallet.findUnique({ where: { userId: req.vendor.id } });
        if (!wallet) {
          wallet = await prisma.vendorWallet.create({
            data: { userId: req.vendor.id, balance: 0 },
          });
        }
        if (!wallet.isFrozen) {
          await prisma.$transaction([
            prisma.vendorWallet.update({
              where: { userId: req.vendor.id },
              data: {
                balance: { increment: vendorEarnings },
                totalEarnings: { increment: vendorEarnings },
                totalCommissionPaid: { increment: commissionAmount },
              },
            }),
            prisma.vendorTransaction.create({
              data: {
                userId: req.vendor.id,
                type: 'CREDIT',
                category: 'ORDER_INCOME',
                amount: order.totalAmount,
                commission: commissionAmount,
                netAmount: vendorEarnings,
                status: 'COMPLETED',
                description: `إيرادات الطلب #${order.orderNumber}`,
                reference: order.id,
                referenceOrderId: order.id,
              },
            }),
            prisma.systemCommissionRecord.create({
              data: {
                userId: req.vendor.id,
                orderId: order.id,
                orderAmount: order.totalAmount,
                commissionAmount,
                vendorEarnings,
              },
            }),
          ]);
        }
      }

      return res.json({ success: true, order: updated, message: 'تم تحديث حالة الطلب' });
    } catch (error) {
      console.error('updateOrderStatus error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  // =====================================================
  // WALLET
  // =====================================================

  /**
   * GET /api/mobile/vendor/wallet
   */
  static async getWallet(req, res) {
    try {
      let wallet = await prisma.vendorWallet.findUnique({
        where: { userId: req.vendor.id },
      });

      if (!wallet) {
        wallet = await prisma.vendorWallet.create({
          data: { userId: req.vendor.id, balance: 0 },
        });
      }

      return res.json({ success: true, wallet });
    } catch (error) {
      console.error('getWallet error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * GET /api/mobile/vendor/wallet/transactions
   */
  static async getTransactions(req, res) {
    try {
      const { page = 1, limit = 20, type } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = { userId: req.vendor.id };
      if (type) where.type = type.toUpperCase();

      const [transactions, total] = await Promise.all([
        prisma.vendorTransaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip,
        }),
        prisma.vendorTransaction.count({ where }),
      ]);

      return res.json({ success: true, transactions, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
      console.error('getTransactions error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  // =====================================================
  // STATIC CONTENT (About, Privacy, Terms)
  // =====================================================

  /**
   * GET /api/mobile/vendor/content/about
   */
  static async getAbout(req, res) {
    try {
      const about = await prisma.about.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ success: true, about });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * GET /api/mobile/vendor/content/privacy
   */
  static async getPrivacy(req, res) {
    try {
      const privacy = await prisma.privacy.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ success: true, privacy });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * GET /api/mobile/vendor/content/terms
   */
  static async getTerms(req, res) {
    try {
      const terms = await prisma.terms.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ success: true, terms });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  // =====================================================
  // DASHBOARD STATS
  // =====================================================

  /**
   * GET /api/mobile/vendor/dashboard
   */
  static async getDashboard(req, res) {
    try {
      const userId = req.vendor.id;

      const [totalOrders, pendingOrders, completedOrders, totalServices, wallet] = await Promise.all([
        prisma.vendorOrder.count({ where: { userId } }),
        prisma.vendorOrder.count({ where: { userId, status: 'PENDING' } }),
        prisma.vendorOrder.count({ where: { userId, status: 'DELIVERED' } }),
        prisma.vendorService.count({ where: { userId } }),
        prisma.vendorWallet.findUnique({ where: { userId } }),
      ]);

      const totalEarnings = await prisma.vendorTransaction.aggregate({
        where: { userId, type: 'CREDIT' },
        _sum: { amount: true },
      });

      return res.json({
        success: true,
        stats: {
          totalOrders,
          pendingOrders,
          completedOrders,
          totalServices,
          walletBalance: wallet?.balance || 0,
          totalEarnings: totalEarnings._sum.amount || 0,
        },
      });
    } catch (error) {
      console.error('getDashboard error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  // =====================================================
  // UPDATE PASSWORD (while logged in)
  // =====================================================

  /**
   * PATCH /api/mobile/vendor/profile/password
   * Body: { currentPassword, newPassword }
   */
  static async updatePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'كلمة السر الحالية والجديدة مطلوبتان' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'كلمة السر الجديدة 6 أحرف على الأقل' });
      }

      const user = await prisma.user.findUnique({ where: { id: req.vendor.id } });
      const isValid = await bcrypt.compare(currentPassword, user.password || '');
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'كلمة السر الحالية غير صحيحة' });
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { id: req.vendor.id }, data: { password: hashed } });

      return res.json({ success: true, message: 'تم تحديث كلمة السر' });
    } catch (error) {
      console.error('updatePassword error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  // ── Bank Accounts ─────────────────────────────────────────────────────

  static async getBankAccounts(req, res) {
    try {
      const accounts = await prisma.vendorBankAccount.findMany({
        where: { userId: req.vendor.id, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      return res.json({ success: true, accounts });
    } catch (error) {
      console.error('getBankAccounts error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  static async addBankAccount(req, res) {
    try {
      const { bankName, bankNameAr, accountName, accountNumber, iban, swiftCode, isDefault } = req.body;
      if (!bankName || !accountName || !accountNumber) {
        return res.status(400).json({ success: false, error: 'اسم البنك واسم صاحب الحساب ورقم الحساب مطلوبين' });
      }

      if (isDefault) {
        await prisma.vendorBankAccount.updateMany({ where: { userId: req.vendor.id }, data: { isDefault: false } });
      }

      const account = await prisma.vendorBankAccount.create({
        data: {
          userId: req.vendor.id, bankName, bankNameAr: bankNameAr || null,
          accountName, accountNumber, iban: iban || null, swiftCode: swiftCode || null,
          isDefault: isDefault || false,
        },
      });
      return res.status(201).json({ success: true, account });
    } catch (error) {
      console.error('addBankAccount error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  static async updateBankAccount(req, res) {
    try {
      const { id } = req.params;
      const existing = await prisma.vendorBankAccount.findFirst({ where: { id, userId: req.vendor.id } });
      if (!existing) return res.status(404).json({ success: false, error: 'الحساب غير موجود' });

      const { bankName, bankNameAr, accountName, accountNumber, iban, swiftCode, isDefault } = req.body;
      if (isDefault) {
        await prisma.vendorBankAccount.updateMany({ where: { userId: req.vendor.id, id: { not: id } }, data: { isDefault: false } });
      }

      const account = await prisma.vendorBankAccount.update({
        where: { id },
        data: { bankName, bankNameAr, accountName, accountNumber, iban, swiftCode, isDefault },
      });
      return res.json({ success: true, account });
    } catch (error) {
      console.error('updateBankAccount error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  static async deleteBankAccount(req, res) {
    try {
      const { id } = req.params;
      const existing = await prisma.vendorBankAccount.findFirst({ where: { id, userId: req.vendor.id } });
      if (!existing) return res.status(404).json({ success: false, error: 'الحساب غير موجود' });

      await prisma.vendorBankAccount.update({ where: { id }, data: { isActive: false } });
      return res.json({ success: true, message: 'تم حذف الحساب البنكي' });
    } catch (error) {
      console.error('deleteBankAccount error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  // ── Withdrawal Requests ───────────────────────────────────────────────

  static async getWithdrawals(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = { userId: req.vendor.id };
      if (status) where.status = status.toUpperCase();

      const [withdrawals, total] = await Promise.all([
        prisma.withdrawalRequest.findMany({
          where,
          include: { bankAccount: { select: { bankName: true, bankNameAr: true, accountNumber: true } } },
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip,
        }),
        prisma.withdrawalRequest.count({ where }),
      ]);
      return res.json({ success: true, withdrawals, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
      console.error('getWithdrawals error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  static async requestWithdrawal(req, res) {
    try {
      const { amount, bankAccountId, vendorNote } = req.body;
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ success: false, error: 'المبلغ المطلوب غير صحيح' });
      }

      const wallet = await prisma.vendorWallet.findUnique({ where: { userId: req.vendor.id } });
      if (!wallet) return res.status(400).json({ success: false, error: 'المحفظة غير موجودة' });
      if (wallet.isFrozen) return res.status(400).json({ success: false, error: 'المحفظة مجمدة' });
      if (wallet.balance < parseFloat(amount)) {
        return res.status(400).json({ success: false, error: 'رصيد غير كافٍ' });
      }

      const pendingTotal = await prisma.withdrawalRequest.aggregate({
        where: { userId: req.vendor.id, status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] } },
        _sum: { amount: true },
      });
      if ((pendingTotal._sum.amount || 0) + parseFloat(amount) > wallet.balance) {
        return res.status(400).json({ success: false, error: 'لديك طلبات سحب معلقة تتجاوز رصيدك' });
      }

      if (bankAccountId) {
        const bankAcc = await prisma.vendorBankAccount.findFirst({ where: { id: bankAccountId, userId: req.vendor.id, isActive: true } });
        if (!bankAcc) return res.status(400).json({ success: false, error: 'الحساب البنكي غير موجود' });
      }

      const withdrawal = await prisma.withdrawalRequest.create({
        data: {
          userId: req.vendor.id,
          amount: parseFloat(amount),
          bankAccountId: bankAccountId || null,
          vendorNote: vendorNote || null,
        },
        include: { bankAccount: { select: { bankName: true, accountNumber: true } } },
      });

      await prisma.notification.create({
        data: {
          userId: req.vendor.id,
          title: 'طلب سحب جديد',
          message: `تم تقديم طلب سحب بمبلغ ${parseFloat(amount)} د.ك وهو قيد المراجعة`,
          type: 'INFO',
          category: 'PAYMENT',
        },
      });

      return res.status(201).json({ success: true, withdrawal });
    } catch (error) {
      console.error('requestWithdrawal error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  static async cancelWithdrawal(req, res) {
    try {
      const { id } = req.params;
      const existing = await prisma.withdrawalRequest.findFirst({ where: { id, userId: req.vendor.id } });
      if (!existing) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      if (existing.status !== 'PENDING') {
        return res.status(400).json({ success: false, error: 'لا يمكن إلغاء هذا الطلب' });
      }

      const withdrawal = await prisma.withdrawalRequest.update({ where: { id }, data: { status: 'REJECTED', adminNote: 'تم الإلغاء بواسطة التاجر' } });
      return res.json({ success: true, withdrawal });
    } catch (error) {
      console.error('cancelWithdrawal error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  // ── Financial Reports ─────────────────────────────────────────────────

  static async getFinancialReport(req, res) {
    try {
      const userId = req.vendor.id;
      const { period } = req.query;

      const now = new Date();
      let dateFrom;
      if (period === 'today') dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      else if (period === 'week') { dateFrom = new Date(now); dateFrom.setDate(dateFrom.getDate() - 7); }
      else if (period === 'month') dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      else if (period === 'year') dateFrom = new Date(now.getFullYear(), 0, 1);
      else dateFrom = null;

      const dateFilter = dateFrom ? { createdAt: { gte: dateFrom } } : {};

      const [wallet, totalIncome, totalCommission, totalWithdrawals, orderStats, txns] = await Promise.all([
        prisma.vendorWallet.findUnique({ where: { userId } }),
        prisma.vendorTransaction.aggregate({ where: { userId, type: 'CREDIT', category: 'ORDER_INCOME', ...dateFilter }, _sum: { amount: true, netAmount: true }, _count: true }),
        prisma.vendorTransaction.aggregate({ where: { userId, type: 'DEBIT', category: 'COMMISSION_DEDUCTION', ...dateFilter }, _sum: { amount: true }, _count: true }),
        prisma.vendorTransaction.aggregate({ where: { userId, type: 'DEBIT', category: 'WITHDRAWAL', ...dateFilter }, _sum: { amount: true }, _count: true }),
        prisma.vendorOrder.groupBy({ by: ['status'], where: { userId, ...dateFilter }, _count: true }),
        prisma.vendorTransaction.findMany({ where: { userId, ...dateFilter }, orderBy: { createdAt: 'desc' }, take: 10 }),
      ]);

      const ordersByStatus = {};
      orderStats.forEach(s => { ordersByStatus[s.status] = s._count; });

      return res.json({
        success: true,
        report: {
          period: period || 'all',
          wallet: { balance: wallet?.balance || 0, totalEarnings: wallet?.totalEarnings || 0, totalWithdrawn: wallet?.totalWithdrawn || 0, totalCommissionPaid: wallet?.totalCommissionPaid || 0, pendingBalance: wallet?.pendingBalance || 0 },
          income: { total: totalIncome._sum.amount || 0, netTotal: totalIncome._sum.netAmount || 0, count: totalIncome._count },
          commission: { total: totalCommission._sum.amount || 0, count: totalCommission._count },
          withdrawals: { total: totalWithdrawals._sum.amount || 0, count: totalWithdrawals._count },
          orders: ordersByStatus,
          recentTransactions: txns,
        },
      });
    } catch (error) {
      console.error('getFinancialReport error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  // ── Order Detail ──────────────────────────────────────────────────────

  static async getOrderById(req, res) {
    try {
      const { id } = req.params;
      const order = await prisma.vendorOrder.findFirst({
        where: { id, userId: req.vendor.id },
        include: {
          items: { include: { service: { select: { id: true, name: true, nameAr: true, price: true, images: true } } } },
          vendorLocation: { select: { id: true, locationName: true, address: true, city: true, area: true, latitude: true, longitude: true } },
        },
      });
      if (!order) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

      const transactions = await prisma.vendorTransaction.findMany({
        where: { referenceOrderId: id },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ success: true, order, transactions });
    } catch (error) {
      console.error('getOrderById error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  // ── Notifications (Vendor scoped) ─────────────────────────────────────

  /**
   * GET /api/mobile/vendor/notifications
   */
  static async getNotifications(req, res) {
    try {
      const userId = req.vendor.id;
      const { isRead, category, limit = 50, offset = 0 } = req.query;

      const where = {
        userId,
        ...(isRead !== undefined && { isRead: isRead === 'true' }),
        ...(category && { category }),
      };

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset),
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: { userId, isRead: false },
        }),
      ]);

      return res.json({
        success: true,
        notifications,
        total,
        unreadCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      console.error('getNotifications error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * GET /api/mobile/vendor/notifications/unread-count
   */
  static async getNotificationsUnreadCount(req, res) {
    try {
      const userId = req.vendor.id;
      const count = await prisma.notification.count({
        where: { userId, isRead: false },
      });
      return res.json({ success: true, count });
    } catch (error) {
      console.error('getNotificationsUnreadCount error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * PATCH /api/mobile/vendor/notifications/:id/read
   */
  static async markNotificationAsRead(req, res) {
    try {
      const userId = req.vendor.id;
      const { id } = req.params;

      const notification = await prisma.notification.findFirst({
        where: { id, userId },
      });
      if (!notification) {
        return res.status(404).json({ success: false, error: 'الإشعار غير موجود' });
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      });

      return res.json({ success: true, notification: updated });
    } catch (error) {
      console.error('markNotificationAsRead error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }

  /**
   * PATCH /api/mobile/vendor/notifications/read-all
   */
  static async markAllNotificationsAsRead(req, res) {
    try {
      const userId = req.vendor.id;
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return res.json({ success: true, message: 'تم تعليم جميع الإشعارات كمقروءة' });
    } catch (error) {
      console.error('markAllNotificationsAsRead error:', error);
      return res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
    }
  }
}

module.exports = VendorController;
