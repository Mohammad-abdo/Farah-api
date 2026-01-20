// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'mysql://root:password@localhost:3306/farah_test';

// Mock external services in test environment
jest.mock('../src/services/EmailService', () => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
    sendBookingConfirmation: jest.fn().mockResolvedValue({ success: true }),
    sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../src/services/SMSService', () => ({
    sendSMS: jest.fn().mockResolvedValue({ success: true }),
    sendOTP: jest.fn().mockResolvedValue({ success: true }),
    sendBookingConfirmation: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../src/services/PaymentService', () => ({
    createPaymentIntent: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'test_secret',
        amount: 10000,
        currency: 'usd',
    }),
    confirmPayment: jest.fn().mockResolvedValue({ status: 'succeeded' }),
}));

// Set test timeout
jest.setTimeout(10000);
