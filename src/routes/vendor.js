const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const VendorAuthController = require('../controllers/VendorAuthController');
const VendorController = require('../controllers/VendorController');
const { authenticateVendor } = require('../middleware/vendorAuth');

const router = express.Router();

// ── Multer setup for vendor uploads ────────────────────────────────────────
const vendorUploadDir = path.join(__dirname, '../../uploads/vendors');
if (!fs.existsSync(vendorUploadDir)) {
  fs.mkdirSync(vendorUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, vendorUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `vendor_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// ── AUTH (Public) ──────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Vendor
 *   description: Vendor / Service-Provider mobile endpoints (api/mobile/vendor)
 */

/**
 * @swagger
 * /api/mobile/vendor/auth/register:
 *   post:
 *     summary: Register a new vendor (service provider)
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, password, vendorType]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "محمد أحمد"
 *               phone:
 *                 type: string
 *                 example: "0501234567"
 *               password:
 *                 type: string
 *                 example: "secret123"
 *               vendorType:
 *                 type: string
 *                 enum: [RESTAURANT, FASHION_STORE, SWEETS_SHOP, HEADPHONES_RENTAL]
 *               businessName:
 *                 type: string
 *               businessNameAr:
 *                 type: string
 *               address:
 *                 type: string
 *               country:
 *                 type: string
 *               city:
 *                 type: string
 *               area:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               googleMapsLink:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vendor registered, OTP sent
 *       400:
 *         description: Validation error
 */
router.post('/auth/register', VendorAuthController.register);

/**
 * @swagger
 * /api/mobile/vendor/auth/verify-otp:
 *   post:
 *     summary: Verify phone OTP after registration
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, otp]
 *             properties:
 *               phone:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Phone verified
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/auth/verify-otp', VendorAuthController.verifyOtp);

/**
 * @swagger
 * /api/mobile/vendor/auth/resend-otp:
 *   post:
 *     summary: Resend verification OTP
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent
 */
router.post('/auth/resend-otp', VendorAuthController.resendOtp);

/**
 * @swagger
 * /api/mobile/vendor/auth/login:
 *   post:
 *     summary: Vendor login
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, password]
 *             properties:
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful with JWT token
 *       401:
 *         description: Invalid credentials
 */
router.post('/auth/login', VendorAuthController.login);

/**
 * @swagger
 * /api/mobile/vendor/auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent if account exists
 */
router.post('/auth/forgot-password', VendorAuthController.forgotPassword);

/**
 * @swagger
 * /api/mobile/vendor/auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, otp, newPassword]
 *             properties:
 *               phone:
 *                 type: string
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/auth/reset-password', VendorAuthController.resetPassword);

// ── PUBLIC CONTENT (no auth needed) ───────────────────────────────────────
router.get('/content/about', VendorController.getAbout);
router.get('/content/privacy', VendorController.getPrivacy);
router.get('/content/terms', VendorController.getTerms);

// ── PROTECTED ROUTES (require vendor JWT + APPROVED status) ───────────────
router.use(authenticateVendor);

// Dashboard
/**
 * @swagger
 * /api/mobile/vendor/dashboard:
 *   get:
 *     summary: Get vendor dashboard stats
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats (total orders, pending, delivered, balance, earnings)
 */
router.get('/dashboard', VendorController.getDashboard);

// ── Profile ────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/mobile/vendor/profile:
 *   get:
 *     summary: Get vendor profile
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor profile data
 */
router.get('/profile', VendorController.getProfile);

/**
 * @swagger
 * /api/mobile/vendor/profile:
 *   patch:
 *     summary: Update vendor profile
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               businessName:
 *                 type: string
 *               businessNameAr:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               country:
 *                 type: string
 *               city:
 *                 type: string
 *               area:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               googleMapsLink:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch('/profile', upload.single('avatar'), VendorController.updateProfile);

// ── Locations (Branches) ───────────────────────────────────────────────────

/**
 * @swagger
 * /api/mobile/vendor/locations:
 *   get:
 *     summary: List vendor branches/locations
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of locations (branches)
 */
router.get('/locations', VendorController.getLocations);

/**
 * @swagger
 * /api/mobile/vendor/locations:
 *   post:
 *     summary: Add a branch/location
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [locationName]
 *             properties:
 *               locationName:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               area:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               isMainLocation:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Location created
 */
router.post('/locations', VendorController.addLocation);

/**
 * @swagger
 * /api/mobile/vendor/locations/{id}:
 *   patch:
 *     summary: Update a branch/location
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Location updated
 */
router.patch('/locations/:id', VendorController.updateLocation);

/**
 * @swagger
 * /api/mobile/vendor/locations/{id}:
 *   delete:
 *     summary: Delete a branch/location
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Location deleted
 */
router.delete('/locations/:id', VendorController.deleteLocation);

/**
 * @swagger
 * /api/mobile/vendor/profile/password:
 *   patch:
 *     summary: Update password while logged in
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 */
router.patch('/profile/password', VendorController.updatePassword);

/**
 * @swagger
 * /api/mobile/vendor/profile:
 *   delete:
 *     summary: Delete vendor account
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 */
router.delete('/profile', VendorController.deleteAccount);

// ── Services ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/mobile/vendor/services:
 *   get:
 *     summary: List vendor's services/products
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of services
 */
router.get('/services', VendorController.getServices);

/**
 * @swagger
 * /api/mobile/vendor/services:
 *   post:
 *     summary: Add a service or product
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Service created
 */
router.post('/services', upload.array('images', 10), VendorController.addService);

/**
 * @swagger
 * /api/mobile/vendor/services/{id}:
 *   patch:
 *     summary: Update a service
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service updated
 */
router.patch('/services/:id', upload.array('images', 10), VendorController.updateService);

/**
 * @swagger
 * /api/mobile/vendor/services/{id}:
 *   delete:
 *     summary: Delete a service
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service deleted
 */
router.delete('/services/:id', VendorController.deleteService);

// ── Orders ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/mobile/vendor/orders:
 *   get:
 *     summary: List vendor orders
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, REJECTED, IN_DELIVERY, DELIVERED, CANCELLED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get('/orders', VendorController.getOrders);

/**
 * @swagger
 * /api/mobile/vendor/orders/{id}:
 *   get:
 *     summary: Get order details
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 */
router.get('/orders/:id', VendorController.getOrderById);

/**
 * @swagger
 * /api/mobile/vendor/orders/{id}/accept:
 *   patch:
 *     summary: Accept a pending order
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order accepted
 */
router.patch('/orders/:id/accept', VendorController.acceptOrder);

/**
 * @swagger
 * /api/mobile/vendor/orders/{id}/reject:
 *   patch:
 *     summary: Reject a pending order
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order rejected
 */
router.patch('/orders/:id/reject', VendorController.rejectOrder);

/**
 * @swagger
 * /api/mobile/vendor/orders/{id}/status:
 *   patch:
 *     summary: Update order delivery status
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [IN_DELIVERY, DELIVERED, CANCELLED]
 *     responses:
 *       200:
 *         description: Status updated (wallet credited on DELIVERED)
 */
router.patch('/orders/:id/status', VendorController.updateOrderStatus);

// ── Wallet ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/mobile/vendor/wallet:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet with current balance
 */
router.get('/wallet', VendorController.getWallet);

/**
 * @swagger
 * /api/mobile/vendor/wallet/transactions:
 *   get:
 *     summary: Get wallet transaction history
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [CREDIT, DEBIT]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of transactions
 */
router.get('/wallet/transactions', VendorController.getTransactions);

/**
 * @swagger
 * /api/mobile/vendor/financial-report:
 *   get:
 *     summary: Get vendor financial report
 *     description: |
 *       Returns aggregated financial statistics for the vendor wallet, income, commission,
 *       withdrawals, orders by status, and recent transactions.
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year, all]
 *         description: Filter report by period. Defaults to all if not provided.
 *     responses:
 *       200:
 *         description: Financial report for the vendor
 */
router.get('/financial-report', VendorController.getFinancialReport);

/**
 * @swagger
 * /api/mobile/vendor/bank-accounts:
 *   get:
 *     summary: Get vendor bank accounts
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active bank accounts
 */
router.get('/bank-accounts', VendorController.getBankAccounts);

/**
 * @swagger
 * /api/mobile/vendor/bank-accounts:
 *   post:
 *     summary: Add a new bank account
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bankName, accountName, accountNumber]
 *             properties:
 *               bankName:
 *                 type: string
 *               bankNameAr:
 *                 type: string
 *               accountName:
 *                 type: string
 *               accountNumber:
 *                 type: string
 *               iban:
 *                 type: string
 *               swiftCode:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Bank account created
 */
router.post('/bank-accounts', VendorController.addBankAccount);

/**
 * @swagger
 * /api/mobile/vendor/bank-accounts/{id}:
 *   patch:
 *     summary: Update an existing bank account
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bankName:
 *                 type: string
 *               bankNameAr:
 *                 type: string
 *               accountName:
 *                 type: string
 *               accountNumber:
 *                 type: string
 *               iban:
 *                 type: string
 *               swiftCode:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Bank account updated
 */
router.patch('/bank-accounts/:id', VendorController.updateBankAccount);

/**
 * @swagger
 * /api/mobile/vendor/bank-accounts/{id}:
 *   delete:
 *     summary: Delete (deactivate) a bank account
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bank account deleted
 */
router.delete('/bank-accounts/:id', VendorController.deleteBankAccount);

/**
 * @swagger
 * /api/mobile/vendor/withdrawals:
 *   get:
 *     summary: Get vendor withdrawal requests
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (e.g., PENDING, APPROVED, REJECTED, COMPLETED)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of withdrawal requests
 */
router.get('/withdrawals', VendorController.getWithdrawals);

/**
 * @swagger
 * /api/mobile/vendor/withdrawals:
 *   post:
 *     summary: Create a new withdrawal request
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *               bankAccountId:
 *                 type: string
 *                 nullable: true
 *               vendorNote:
 *                 type: string
 *     responses:
 *       201:
 *         description: Withdrawal request created
 */
router.post('/withdrawals', VendorController.requestWithdrawal);

/**
 * @swagger
 * /api/mobile/vendor/withdrawals/{id}/cancel:
 *   patch:
 *     summary: Cancel a pending withdrawal request
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Withdrawal request cancelled
 */
router.patch('/withdrawals/:id/cancel', VendorController.cancelWithdrawal);

/**
 * @swagger
 * /api/mobile/vendor/notifications:
 *   get:
 *     summary: Get vendor notifications
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Filter by read/unread status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of notifications for the vendor
 */
router.get('/notifications', VendorController.getNotifications);

/**
 * @swagger
 * /api/mobile/vendor/notifications/unread-count:
 *   get:
 *     summary: Get unread notifications count for vendor
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notifications count
 */
router.get('/notifications/unread-count', VendorController.getNotificationsUnreadCount);

/**
 * @swagger
 * /api/mobile/vendor/notifications/{id}/read:
 *   patch:
 *     summary: Mark a vendor notification as read
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
router.patch('/notifications/:id/read', VendorController.markNotificationAsRead);

/**
 * @swagger
 * /api/mobile/vendor/notifications/read-all:
 *   patch:
 *     summary: Mark all vendor notifications as read
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch('/notifications/read-all', VendorController.markAllNotificationsAsRead);

module.exports = router;
