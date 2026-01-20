const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const logger = require('../utils/logger');

// General API rate limiter - 200 requests per 15 minutes (increased for development)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        res.status(429).json({
            success: false,
            error: 'Too many requests from this IP, please try again later'
        });
    }
});

// Auth endpoints rate limiter - 5 requests per 15 minutes (stricter)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    skipSuccessfulRequests: true, // Don't count successful requests
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Auth rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            body: { phone: req.body.phone, email: req.body.email }
        });
        res.status(429).json({
            success: false,
            error: 'Too many authentication attempts, please try again after 15 minutes'
        });
    }
});

// OTP rate limiter - 3 OTP requests per hour per phone number
const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    keyGenerator: (req) => {
        // Use phone number as key, fallback to IP using proper IPv6 handler
        return req.body.phone || ipKeyGenerator(req);
    },
    message: {
        success: false,
        error: 'Too many OTP requests for this phone number, please try again after 1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('OTP rate limit exceeded', {
            phone: req.body.phone,
            ip: req.ip
        });
        res.status(429).json({
            success: false,
            error: 'Too many OTP requests for this phone number, please try again after 1 hour'
        });
    }
});

// Password reset rate limiter - 3 requests per hour
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    keyGenerator: (req) => {
        // Use phone number as key, fallback to IP using proper IPv6 handler
        return req.body.phone || ipKeyGenerator(req);
    },
    message: {
        success: false,
        error: 'Too many password reset attempts, please try again after 1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Password reset rate limit exceeded', {
            phone: req.body.phone,
            ip: req.ip
        });
        res.status(429).json({
            success: false,
            error: 'Too many password reset attempts, please try again after 1 hour'
        });
    }
});

// Admin endpoints rate limiter - 200 requests per 15 minutes (more lenient for admin dashboard)
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {
        success: false,
        error: 'Too many admin requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Admin rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        res.status(429).json({
            success: false,
            error: 'Too many admin requests, please try again later'
        });
    }
});

// Notifications rate limiter - 100 requests per 5 minutes (for polling)
const notificationsLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100,
    message: {
        success: false,
        error: 'Too many notification requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Notifications rate limit exceeded', {
            ip: req.ip,
            path: req.path
        });
        res.status(429).json({
            success: false,
            error: 'Too many notification requests, please try again later'
        });
    }
});

// Mobile API rate limiter - 300 requests per 15 minutes (more lenient for mobile app)
const mobileLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    message: {
        success: false,
        error: 'Too many mobile requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Mobile rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        res.status(429).json({
            success: false,
            error: 'Too many mobile requests, please try again later'
        });
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
    otpLimiter,
    passwordResetLimiter,
    adminLimiter,
    notificationsLimiter,
    mobileLimiter
};
