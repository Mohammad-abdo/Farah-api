const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const logger = require('./utils/logger');
const { apiLimiter, adminLimiter, notificationsLimiter, mobileLimiter } = require('./middleware/rateLimiter');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - Allow frontend connection
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Swagger UI
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow cross-origin resource loading
}));

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '100mb' })); // No size limit for images
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// CORS middleware specifically for /uploads - must be before static file serving
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for all requests (including preflight)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Last-Modified, ETag');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  next();
});

// Apply rate limiting - specific routes first (more lenient)
// Mobile routes get higher limits (300 per 15 min) - mobile apps make many requests
app.use('/api/mobile', mobileLimiter);
// Admin routes get higher limits (200 per 15 min)
app.use('/api/admin', adminLimiter);
// Notifications routes get higher limits for polling (100 per 5 min)
app.use('/api/notifications', notificationsLimiter);
// Apply general API rate limiting to other routes (200 per 15 min)
app.use('/api/', apiLimiter);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Farah API Documentation'
}));

// Serve admin dashboard static files
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Serve uploaded files with CORS headers (CORS middleware already applied above)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    // Ensure CORS headers are set on the response for all static files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Last-Modified, ETag');
    res.setHeader('Access-Control-Allow-Credentials', 'false');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Set proper content type for images
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
    
    // Cache control for images
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  }
}));

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 message:
 *                   type: string
 *                   example: Farah API is running
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Farah API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Import routes
const venuesRoutes = require('./routes/venues');
const servicesRoutes = require('./routes/services');
const bookingsRoutes = require('./routes/bookings');
const categoriesRoutes = require('./routes/categories');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const reportsRoutes = require('./routes/reports');
const reviewsRoutes = require('./routes/reviews');
const permissionsRoutes = require('./routes/permissions');
const rolesRoutes = require('./routes/roles');
const notificationsRoutes = require('./routes/notifications');
const settingsRoutes = require('./routes/settings');
const contentRoutes = require('./routes/content');
const slidersRoutes = require('./routes/sliders');
const onboardingRoutes = require('./routes/onboarding');
const mobileRoutes = require('./routes/mobile');
const providerRoutes = require('./routes/provider');
const paymentsRoutes = require('./routes/payments');

// Use routes
app.use('/api/venues', venuesRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/sliders', slidersRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/payments', paymentsRoutes);

// Import error handler
const { errorHandler } = require('./utils/errors');

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Listen on all network interfaces (0.0.0.0) to allow access from other devices
app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'localhost';
  
  // Find local IP address (usually 192.168.x.x)
  for (const name of Object.keys(networkInterfaces)) {
    for (const iface of networkInterfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168.')) {
        localIP = iface.address;
        break;
      }
    }
    if (localIP !== 'localhost') break;
  }
  
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🌐 Server is accessible on your network at http://${localIP}:${PORT}`);
  console.log(`📱 Make sure your mobile device is on the same Wi-Fi network`);
});

