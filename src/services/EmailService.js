const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        // Check if email configuration is provided
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
            logger.warn('Email configuration not found. Emails will be logged to console only.');
            return;
        }

        try {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            logger.info('Email transporter initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize email transporter', { error: error.message });
        }
    }

    /**
     * Send email
     * @param {string} to - Recipient email
     * @param {string} subject - Email subject
     * @param {string} html - HTML content
     * @param {string} text - Plain text content (optional)
     */
    async sendEmail(to, subject, html, text = null) {
        try {
            if (!this.transporter) {
                logger.info('Email would be sent', { to, subject });
                console.log('📧 Email (Development Mode):');
                console.log(`To: ${to}`);
                console.log(`Subject: ${subject}`);
                console.log(`Content: ${text || html}`);
                console.log('---');
                return { success: true, mode: 'development' };
            }

            const mailOptions = {
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to,
                subject,
                html,
                text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
            };

            const info = await this.transporter.sendMail(mailOptions);

            logger.info('Email sent successfully', {
                to,
                subject,
                messageId: info.messageId,
            });

            return { success: true, messageId: info.messageId };
        } catch (error) {
            logger.error('Failed to send email', {
                to,
                subject,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Send booking confirmation email
     */
    async sendBookingConfirmation(user, booking) {
        const subject = 'Booking Confirmation - Farah';
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2d2871;">Booking Confirmed!</h1>
        <p>Dear ${user.name},</p>
        <p>Your booking has been confirmed. Here are the details:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
          <h2 style="color: #2d2871; margin-top: 0;">Booking Details</h2>
          <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
          <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
          <p><strong>Total Amount:</strong> $${booking.finalAmount}</p>
          <p><strong>Status:</strong> ${booking.status}</p>
        </div>
        
        <p style="margin-top: 20px;">Thank you for choosing Farah!</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #888; font-size: 12px;">This is an automated email. Please do not reply.</p>
      </div>
    `;

        return this.sendEmail(user.email, subject, html);
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(user, otp) {
        const subject = 'Password Reset Request - Farah';
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2d2871;">Password Reset Request</h1>
        <p>Dear ${user.name},</p>
        <p>You have requested to reset your password. Use the following OTP code:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; text-align: center;">
          <h2 style="color: #2d2871; font-size: 36px; letter-spacing: 5px; margin: 0;">${otp}</h2>
        </div>
        
        <p style="margin-top: 20px;"><strong>This code will expire in 5 minutes.</strong></p>
        <p>If you didn't request this, please ignore this email.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #888; font-size: 12px;">This is an automated email. Please do not reply.</p>
      </div>
    `;

        return this.sendEmail(user.email, subject, html);
    }

    /**
     * Send welcome email
     */
    async sendWelcomeEmail(user) {
        const subject = 'Welcome to Farah!';
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2d2871;">Welcome to Farah!</h1>
        <p>Dear ${user.name},</p>
        <p>Thank you for joining Farah. We're excited to have you!</p>
        
        <p>You can now:</p>
        <ul>
          <li>Browse and book amazing venues</li>
          <li>Hire professional services for your events</li>
          <li>Manage your bookings easily</li>
          <li>Save your favorite venues</li>
        </ul>
        
        <p style="margin-top: 20px;">Get started by exploring our venues and services!</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #888; font-size: 12px;">This is an automated email. Please do not reply.</p>
      </div>
    `;

        if (user.email) {
            return this.sendEmail(user.email, subject, html);
        }
    }

    /**
     * Send booking reminder email
     */
    async sendBookingReminder(user, booking, hoursUntil) {
        const subject = `Booking Reminder - ${hoursUntil} hours until your event`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2d2871;">Booking Reminder</h1>
        <p>Dear ${user.name},</p>
        <p>This is a friendly reminder about your upcoming booking in ${hoursUntil} hours.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
          <h2 style="color: #2d2871; margin-top: 0;">Booking Details</h2>
          <p><strong>Booking Number:</strong> ${booking.bookingNumber}</p>
          <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
          ${booking.startTime ? `<p><strong>Time:</strong> ${booking.startTime}</p>` : ''}
        </div>
        
        <p style="margin-top: 20px;">We look forward to serving you!</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #888; font-size: 12px;">This is an automated email. Please do not reply.</p>
      </div>
    `;

        if (user.email) {
            return this.sendEmail(user.email, subject, html);
        }
    }
}

// Export singleton instance
module.exports = new EmailService();
