const jwt = require('jsonwebtoken');
const getPrisma = require('../utils/prisma');
const prisma = getPrisma();

/**
 * Middleware to verify Vendor JWT token.
 * Vendor = User with role PROVIDER (مزود الخدمة = المورد). Attach user + vendorProfile as req.vendor.
 */
const authenticateVendor = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token expired' });
      }
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Support both vendorId (legacy) and userId
    const vendorUserId = decoded.vendorId || decoded.userId;
    if (!vendorUserId) {
      return res.status(401).json({ success: false, error: 'Invalid vendor token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: vendorUserId },
      include: { vendorProfile: true },
    });

    if (!user || user.role !== 'PROVIDER') {
      return res.status(401).json({ success: false, error: 'Vendor not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account is deactivated' });
    }

    const profile = user.vendorProfile;
    if (profile && !profile.isActive) {
      return res.status(403).json({ success: false, error: 'Account is deactivated' });
    }

    if (profile && profile.status === 'PENDING') {
      return res.status(403).json({
        success: false,
        error: 'Account pending admin approval',
        status: 'PENDING',
      });
    }

    if (profile && profile.status === 'REJECTED') {
      return res.status(403).json({
        success: false,
        error: 'Account has been rejected',
        status: 'REJECTED',
      });
    }

    if (profile && profile.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: 'Account is suspended',
        status: 'SUSPENDED',
      });
    }

    // Shape compatible with old req.vendor (id, name, phone, vendorType, status, etc.)
    req.vendor = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      vendorType: profile?.vendorType,
      status: profile?.status ?? 'PENDING',
      isActive: user.isActive && (profile?.isActive ?? true),
      avatar: profile?.avatar ?? user.avatar,
      businessName: profile?.businessName,
      phoneVerified: profile?.phoneVerified ?? false,
    };
    next();
  } catch (error) {
    console.error('Vendor authentication error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};

/**
 * Middleware that allows PENDING vendors through (used after registration flow)
 */
const authenticateVendorAny = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token expired' });
      }
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const vendorUserId = decoded.vendorId || decoded.userId;
    if (!vendorUserId) {
      return res.status(401).json({ success: false, error: 'Invalid vendor token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: vendorUserId },
      include: { vendorProfile: true },
    });

    if (!user || user.role !== 'PROVIDER') {
      return res.status(401).json({ success: false, error: 'Vendor not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account is deactivated' });
    }

    const profile = user.vendorProfile;
    req.vendor = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      vendorType: profile?.vendorType,
      status: profile?.status ?? 'PENDING',
      isActive: user.isActive && (profile?.isActive ?? true),
      avatar: profile?.avatar ?? user.avatar,
      businessName: profile?.businessName,
      phoneVerified: profile?.phoneVerified ?? false,
    };
    next();
  } catch (error) {
    console.error('Vendor authentication error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};

module.exports = { authenticateVendor, authenticateVendorAny };
