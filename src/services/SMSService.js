const twilio = require('twilio');
const logger = require('../utils/logger');

class SMSService {
    constructor() {
        this.client = null;
        this.initializeClient();
    }

    initializeClient() {
        // Check if Twilio configuration is provided
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            logger.warn('Twilio configuration not found. SMS will be logged to console only.');
            return;
        }

        try {
            this.client = twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );

            logger.info('Twilio SMS client initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Twilio client', { error: error.message });
        }
    }

    /**
     * Send SMS
     * @param {string} to - Phone number (E.164 format, e.g., +1234567890)
     * @param {string} message - SMS message text
     */
    async sendSMS(to, message) {
        try {
            if (!this.client) {
                logger.info('SMS would be sent', { to, message });
                console.log('📱 SMS (Development Mode):');
                console.log(`To: ${to}`);
                console.log(`Message: ${message}`);
                console.log('---');
                return { success: true, mode: 'development' };
            }

            // Format phone number to E.164 if needed
            let formattedPhone = to;
            if (!to.startsWith('+')) {
                // Add default country code if configured
                const defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || '+20'; // Egypt
                formattedPhone = defaultCountryCode + to;
            }

            const result = await this.client.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: formattedPhone,
            });

            logger.info('SMS sent successfully', {
                to: formattedPhone,
                sid: result.sid,
                status: result.status,
            });

            return { success: true, sid: result.sid, status: result.status };
        } catch (error) {
            logger.error('Failed to send SMS', {
                to,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Send OTP via SMS
     */
    async sendOTP(phone, otp) {
        const message = `Your Farah verification code is: ${otp}. This code will expire in 5 minutes.`;
        return this.sendSMS(phone, message);
    }

    /**
     * Send password reset OTP
     */
    async sendPasswordResetOTP(phone, otp) {
        const message = `Your Farah password reset code is: ${otp}. This code will expire in 5 minutes. If you didn't request this, please ignore.`;
        return this.sendSMS(phone, message);
    }

    /**
     * Send booking confirmation SMS
     */
    async sendBookingConfirmation(phone, bookingNumber, date) {
        const formattedDate = new Date(date).toLocaleDateString();
        const message = `Your Farah booking #${bookingNumber} is confirmed for ${formattedDate}. Thank you!`;
        return this.sendSMS(phone, message);
    }

    /**
     * Send booking reminder SMS
     */
    async sendBookingReminder(phone, bookingNumber, hoursUntil) {
        const message = `Reminder: Your Farah booking #${bookingNumber} is in ${hoursUntil} hours. Looking forward to seeing you!`;
        return this.sendSMS(phone, message);
    }

    /**
     * Send booking cancellation SMS
     */
    async sendBookingCancellation(phone, bookingNumber) {
        const message = `Your Farah booking #${bookingNumber} has been cancelled. For questions, please contact support.`;
        return this.sendSMS(phone, message);
    }

    /**
     * Verify phone number format
     */
    isValidPhoneNumber(phone) {
        // Basic validation - should be 10-15 digits
        const cleanPhone = phone.replace(/\D/g, '');
        return cleanPhone.length >= 10 && cleanPhone.length <= 15;
    }

    /**
     * Format phone number to E.164
     */
    formatPhoneNumber(phone, countryCode = null) {
        // Remove all non-digit characters
        let cleanPhone = phone.replace(/\D/g, '');

        // If already has country code
        if (phone.startsWith('+')) {
            return phone;
        }

        // Add country code
        const defaultCode = countryCode || process.env.DEFAULT_COUNTRY_CODE || '+20';
        return defaultCode + cleanPhone;
    }
}

// Export singleton instance
module.exports = new SMSService();
