const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { authLimiter, otpLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const {
    registerSchema,
    loginSchema,
    adminLoginSchema,
    sendOTPSchema,
    verifyOTPSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateProfileSchema
} = require('../validators/schemas');

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: User already exists
 */
router.post('/register', authLimiter, validate(registerSchema), AuthController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *             properties:
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);

/**
 * @swagger
 * /api/auth/admin/login:
 *   post:
 *     summary: Admin login with email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Access denied
 */
router.post('/admin/login', authLimiter, validate(adminLoginSchema), AuthController.adminLogin);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, AuthController.getMe);
router.patch('/me', authenticate, validate(updateProfileSchema), AuthController.updateProfile);
router.delete('/me', authenticate, AuthController.deleteMe);

const OTPController = require('../controllers/OTPController');

// Send OTP
router.post('/otp/send', otpLimiter, validate(sendOTPSchema), OTPController.sendOTP);

// Verify OTP
router.post('/otp/verify', validate(verifyOTPSchema), OTPController.verifyOTP);

// Password Reset
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

module.exports = router;

