# Swagger API Documentation Guide

## Access Swagger UI

After starting the backend server, access Swagger documentation at:

```
http://localhost:5000/api-docs
```

## Features

- **Interactive API Testing**: Test all endpoints directly from the browser
- **Complete API Documentation**: All endpoints are documented with request/response schemas
- **Authentication Support**: JWT Bearer token authentication is supported
- **Schema Definitions**: All data models are defined and documented

## API Endpoints Documented

### Health
- `GET /api/health` - Health check endpoint

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Venues
- `GET /api/venues` - Get all venues
- `GET /api/venues/top` - Get top rated venues
- `GET /api/venues/popular` - Get popular venues
- `GET /api/venues/:id` - Get venue by ID

### Services
- All service endpoints are documented

### Bookings
- All booking endpoints are documented

### Categories
- All category endpoints are documented

### Admin
- All admin endpoints are documented (requires ADMIN role)

### Reports
- All report endpoints are documented

## Using Swagger UI

1. **View Endpoints**: Click on any endpoint to expand and see details
2. **Try It Out**: Click "Try it out" button to test the endpoint
3. **Fill Parameters**: Enter required parameters
4. **Execute**: Click "Execute" to send the request
5. **View Response**: See the response below

## Authentication in Swagger

For protected endpoints:

1. First, login using `/api/auth/login` endpoint
2. Copy the `token` from the response
3. Click the "Authorize" button at the top of Swagger UI
4. Enter: `Bearer <your-token>`
5. Click "Authorize"
6. Now all protected endpoints will use this token

## Example: Testing Health Endpoint

1. Open `http://localhost:5000/api-docs`
2. Find "Health" section
3. Click on `GET /api/health`
4. Click "Try it out"
5. Click "Execute"
6. View the response:
   ```json
   {
     "status": "OK",
     "message": "Farah API is running",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "version": "1.0.0"
   }
   ```

## Troubleshooting

### Swagger UI not loading
- Make sure backend server is running
- Check if port 5000 is available
- Verify `swagger-ui-express` and `swagger-jsdoc` are installed

### Endpoints not showing
- Check if routes are properly documented with Swagger comments
- Verify `apis` path in `src/config/swagger.js` is correct

### CORS errors
- CORS is configured to allow frontend connections
- Check `corsOptions` in `src/server.js`



