const Joi = require('joi');

// Auth validation schemas
const registerSchema = Joi.object({
    name: Joi.string().optional().allow('').min(2).max(100).messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 100 characters'
    }),
    nameAr: Joi.string().optional().allow('').max(100),
    phone: Joi.string().required().custom((value, helpers) => {
        if (!value) {
            return helpers.error('string.empty');
        }
        // Remove +, spaces, dashes, and parentheses, keep only digits
        const cleaned = value.replace(/[+\s\-()]/g, '');
        // Check if it's 10-15 digits
        if (!/^[0-9]{10,15}$/.test(cleaned)) {
            return helpers.error('string.pattern.base');
        }
        // Return cleaned phone number (without + and spaces)
        return cleaned;
    }).messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Phone number must be 10-15 digits (with or without country code)'
    }),
    email: Joi.string().email().optional().allow(''),
    password: Joi.string().min(6).optional().messages({
        'string.min': 'Password must be at least 6 characters'
    }),
    location: Joi.string().optional().allow(''),
    locationAr: Joi.string().optional().allow('')
});

const loginSchema = Joi.object({
    phone: Joi.string().required().messages({
        'string.empty': 'Phone number is required'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required'
    })
});

const adminLoginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Invalid email format'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required'
    })
});

const sendOTPSchema = Joi.object({
    phone: Joi.string().required().custom((value, helpers) => {
        if (!value) {
            return helpers.error('string.empty');
        }
        // Remove +, spaces, dashes, and parentheses, keep only digits
        const cleaned = value.replace(/[+\s\-()]/g, '');
        // Check if it's 10-15 digits (allows country codes)
        if (!/^[0-9]{10,15}$/.test(cleaned)) {
            return helpers.error('string.pattern.base');
        }
        // Return cleaned phone number (without + and spaces)
        return cleaned;
    }).messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Phone number must be 10-15 digits (with or without country code)'
    })
});

const verifyOTPSchema = Joi.object({
    phone: Joi.string().required().custom((value, helpers) => {
        if (!value) {
            return helpers.error('string.empty');
        }
        // Remove +, spaces, dashes, and parentheses, keep only digits
        const cleaned = value.replace(/[+\s\-()]/g, '');
        // Check if it's 10-15 digits (allows country codes)
        if (!/^[0-9]{10,15}$/.test(cleaned)) {
            return helpers.error('string.pattern.base');
        }
        // Return cleaned phone number (without + and spaces)
        return cleaned;
    }).messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Phone number must be 10-15 digits (with or without country code)'
    }),
    otp: Joi.string().required().length(6).messages({
        'string.empty': 'OTP is required',
        'string.length': 'OTP must be 6 digits'
    }),
    isRegistration: Joi.boolean().optional(),
    name: Joi.string().optional().allow(''),
    nameAr: Joi.string().optional().allow(''),
    email: Joi.string().email().optional().allow(''),
    locationAr: Joi.string().optional().allow('')
});

const forgotPasswordSchema = Joi.object({
    phone: Joi.string().required().custom((value, helpers) => {
        if (!value) {
            return helpers.error('string.empty');
        }
        // Remove +, spaces, dashes, and parentheses, keep only digits
        const cleaned = value.replace(/[+\s\-()]/g, '');
        // Check if it's 10-15 digits (allows country codes)
        if (!/^[0-9]{10,15}$/.test(cleaned)) {
            return helpers.error('string.pattern.base');
        }
        // Return cleaned phone number (without + and spaces)
        return cleaned;
    }).messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Phone number must be 10-15 digits (with or without country code)'
    })
});

const resetPasswordSchema = Joi.object({
    phone: Joi.string().required().custom((value, helpers) => {
        if (!value) {
            return helpers.error('string.empty');
        }
        // Remove +, spaces, dashes, and parentheses, keep only digits
        const cleaned = value.replace(/[+\s\-()]/g, '');
        // Check if it's 10-15 digits (allows country codes)
        if (!/^[0-9]{10,15}$/.test(cleaned)) {
            return helpers.error('string.pattern.base');
        }
        // Return cleaned phone number (without + and spaces)
        return cleaned;
    }).messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Phone number must be 10-15 digits (with or without country code)'
    }),
    otp: Joi.string().required().length(6).messages({
        'string.empty': 'OTP is required',
        'string.length': 'OTP must be 6 digits'
    }),
    newPassword: Joi.string().required().min(6).messages({
        'string.empty': 'New password is required',
        'string.min': 'Password must be at least 6 characters'
    })
});

// Booking validation schemas
const createBookingSchema = Joi.object({
    venueId: Joi.string().uuid().optional().allow(null),
    date: Joi.date().iso().required().messages({
        'date.base': 'Invalid date format',
        'any.required': 'Date is required'
    }),
    startTime: Joi.string().optional().allow('').pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: Joi.string().optional().allow('').pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    location: Joi.string().optional().allow(''),
    locationAddress: Joi.string().optional().allow(''),
    locationLatitude: Joi.number().optional().allow(null),
    locationLongitude: Joi.number().optional().allow(null),
    services: Joi.array().items(
        Joi.alternatives().try(
            Joi.string().uuid(),
            Joi.object({
                serviceId: Joi.string().uuid().required(),
                id: Joi.string().uuid().optional(),
                price: Joi.number().min(0).required(),
                date: Joi.date().iso().optional(),
                startTime: Joi.string().optional().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
                endTime: Joi.string().optional().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
                duration: Joi.number().min(1).optional(),
                locationType: Joi.string().valid('venue', 'home', 'hotel', 'outdoor', 'other').optional(),
                locationAddress: Joi.string().optional(),
                locationLatitude: Joi.number().optional(),
                locationLongitude: Joi.number().optional(),
                notes: Joi.string().optional().allow('')
            })
        )
    ).min(0).optional(),
    totalAmount: Joi.number().min(0).required().messages({
        'number.base': 'Total amount must be a number',
        'number.min': 'Total amount cannot be negative',
        'any.required': 'Total amount is required'
    }),
    discount: Joi.number().min(0).optional().default(0),
    cardId: Joi.string().uuid().optional().allow(null),
    notes: Joi.string().optional().allow('')
}).custom((value, helpers) => {
    // Custom validation: must have either venue or services
    if (!value.venueId && (!value.services || value.services.length === 0)) {
        return helpers.error('custom.booking', {
            message: 'Booking must include either a venue or at least one service'
        });
    }
    return value;
});

// Profile update validation
const updateProfileSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    nameAr: Joi.string().max(100).optional().allow(''),
    email: Joi.string().email().optional().allow(''),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
    location: Joi.string().optional().allow(''),
    locationAr: Joi.string().optional().allow('')
});

module.exports = {
    registerSchema,
    loginSchema,
    adminLoginSchema,
    sendOTPSchema,
    verifyOTPSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    createBookingSchema,
    updateProfileSchema
};
