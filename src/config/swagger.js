const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Farah API',
      version: '1.0.0',
      description: 'API documentation for Farah Wedding Services Platform',
      contact: {
        name: 'Farah Support',
        email: 'support@farah.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.farah.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['CUSTOMER', 'PROVIDER', 'ADMIN'] },
            location: { type: 'string' },
            avatar: { type: 'string', format: 'uri' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Venue: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            nameAr: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number', format: 'float' },
            location: { type: 'string' },
            rating: { type: 'number', format: 'float' },
            reviewCount: { type: 'integer' },
            capacity: { type: 'integer' },
            images: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' }
          }
        },
        Service: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            nameAr: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number', format: 'float' },
            categoryId: { type: 'string', format: 'uuid' },
            location: { type: 'string' },
            rating: { type: 'number', format: 'float' },
            reviewCount: { type: 'integer' },
            images: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' }
          }
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            bookingNumber: { type: 'string' },
            customerId: { type: 'string', format: 'uuid' },
            venueId: { type: 'string', format: 'uuid' },
            date: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'ACTIVE', 'COMPLETED', 'CANCELLED'] },
            totalAmount: { type: 'number', format: 'float' },
            discount: { type: 'number', format: 'float' },
            finalAmount: { type: 'number', format: 'float' },
            paymentStatus: { type: 'string', enum: ['PENDING', 'PAID', 'REFUNDED', 'FAILED'] }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Venues', description: 'Venue management endpoints' },
      { name: 'Services', description: 'Service management endpoints' },
      { name: 'Bookings', description: 'Booking management endpoints' },
      { name: 'Categories', description: 'Category management endpoints' },
      { name: 'Admin', description: 'Admin management endpoints' },
      { name: 'Reports', description: 'Report generation endpoints' }
    ]
  },
  apis: ['./src/routes/*.js', './src/server.js'] // Path to the API files
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

