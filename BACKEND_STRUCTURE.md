# Backend Structure

## Directory Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   └── swagger.js    # Swagger configuration
│   ├── controllers/      # Business logic controllers
│   │   ├── AuthController.js
│   │   ├── VenuesController.js
│   │   ├── ServicesController.js
│   │   ├── BookingsController.js
│   │   ├── CategoriesController.js
│   │   └── AdminController.js
│   ├── middleware/       # Express middleware
│   │   ├── auth.js      # Authentication middleware
│   │   └── permissions.js  # Permission middleware
│   ├── routes/          # API routes
│   │   ├── auth.js
│   │   ├── venues.js
│   │   ├── services.js
│   │   ├── bookings.js
│   │   ├── categories.js
│   │   ├── admin.js
│   │   └── reports.js
│   ├── utils/           # Utility functions
│   │   ├── prisma.js    # Prisma Client singleton
│   │   └── errors.js    # Error handling utilities
│   ├── scripts/         # Scripts
│   │   └── init-permissions.js
│   └── server.js        # Express app entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.js          # Database seed
└── package.json
```

## Architecture

### Controllers
- **Purpose**: Handle business logic and data processing
- **Pattern**: Static class methods
- **Responsibilities**:
  - Validate input
  - Call Prisma for database operations
  - Format responses
  - Handle errors

### Routes
- **Purpose**: Define API endpoints
- **Responsibilities**:
  - Define routes
  - Apply middleware (auth, permissions)
  - Call controller methods
  - Swagger documentation

### Middleware
- **Purpose**: Request processing and validation
- **Examples**:
  - `authenticate`: Verify JWT tokens
  - `requireRole`: Check user roles
  - `requirePermission`: Check permissions

### Utils
- **Purpose**: Reusable utilities
- **Files**:
  - `prisma.js`: Prisma Client singleton
  - `errors.js`: Custom error classes and handler

## Migration Guide

### Old Structure (Routes with Logic)
```javascript
// routes/auth.js
router.post('/register', async (req, res) => {
  // All logic here
});
```

### New Structure (Controllers + Routes)
```javascript
// controllers/AuthController.js
class AuthController {
  static async register(req, res, next) {
    // Logic here
  }
}

// routes/auth.js
router.post('/register', AuthController.register);
```

## Benefits

1. **Separation of Concerns**: Logic separated from routing
2. **Reusability**: Controllers can be used in multiple routes
3. **Testability**: Controllers are easier to test
4. **Maintainability**: Cleaner, more organized code
5. **Scalability**: Easy to add new features

## Next Steps

1. ✅ Create controllers structure
2. ✅ Create utility files
3. ⏳ Refactor existing routes to use controllers
4. ⏳ Update error handling
5. ⏳ Add validation middleware
6. ⏳ Add logging
7. ⏳ Add tests



