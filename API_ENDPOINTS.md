# API Endpoints Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### Register User
- **POST** `/auth/register`
- **Description**: Register a new user
- **Body**:
  ```json
  {
    "name": "string",
    "phone": "string",
    "email": "string (optional)",
    "password": "string (optional)",
    "location": "string (optional)"
  }
  ```
- **Response**: `{ success: true, user: {...}, token: "..." }`

### Login
- **POST** `/auth/login`
- **Description**: Login user
- **Body**:
  ```json
  {
    "phone": "string",
    "password": "string"
  }
  ```
- **Response**: `{ success: true, user: {...}, token: "..." }`

### Get Current User
- **GET** `/auth/me`
- **Auth**: Required
- **Response**: `{ success: true, user: {...} }`

### Send OTP
- **POST** `/auth/otp/send`
- **Description**: Send OTP to phone number
- **Body**:
  ```json
  {
    "phone": "string"
  }
  ```
- **Response**: `{ success: true, message: "...", expiresIn: 300 }`

### Verify OTP
- **POST** `/auth/otp/verify`
- **Description**: Verify OTP and login/register
- **Body**:
  ```json
  {
    "phone": "string",
    "otp": "string"
  }
  ```
- **Response**: `{ success: true, user: {...}, token: "..." }`

---

## Venues Endpoints

### Get All Venues
- **GET** `/venues`
- **Query Params**: `search`, `location`, `minPrice`, `maxPrice`, `rating`, `limit`, `offset`
- **Response**: `{ success: true, venues: [...], total: number }`

### Get Venue by ID
- **GET** `/venues/:id`
- **Response**: `{ success: true, venue: {...} }`

---

## Services Endpoints

### Get All Services
- **GET** `/services`
- **Query Params**: `categoryId`, `search`, `limit`, `offset`
- **Response**: `{ success: true, services: [...], total: number }`

### Get Service by ID
- **GET** `/services/:id`
- **Response**: `{ success: true, service: {...} }`

### Get Services by Category
- **GET** `/services/category/:categoryId`
- **Query Params**: `limit`, `offset`
- **Response**: `{ success: true, services: [...] }`

---

## Bookings Endpoints

### Get All Bookings
- **GET** `/bookings`
- **Auth**: Required
- **Query Params**: `userId`, `status`, `limit`, `offset`
- **Response**: `{ success: true, bookings: [...], total: number }`

### Get Booking by ID
- **GET** `/bookings/:id`
- **Auth**: Required
- **Response**: `{ success: true, booking: {...} }`

### Create Booking
- **POST** `/bookings`
- **Auth**: Required
- **Body**:
  ```json
  {
    "venueId": "string (optional)",
    "date": "ISO date string",
    "services": [
      { "id": "string", "price": number }
    ],
    "totalAmount": number,
    "discount": number (optional),
    "paymentMethod": "string (optional)",
    "notes": "string (optional)"
  }
  ```
- **Response**: `{ success: true, booking: {...} }`

### Update Booking Status
- **PATCH** `/bookings/:id/status`
- **Auth**: Required
- **Body**:
  ```json
  {
    "status": "PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED"
  }
  ```
- **Response**: `{ success: true, booking: {...} }`

### Cancel Booking
- **PATCH** `/bookings/:id/cancel`
- **Auth**: Required
- **Response**: `{ success: true, booking: {...} }`

---

## Categories Endpoints

### Get All Categories
- **GET** `/categories`
- **Response**: `{ success: true, categories: [...] }`

### Get Category by ID
- **GET** `/categories/:id`
- **Response**: `{ success: true, category: {...} }`

### Create Category (Admin Only)
- **POST** `/categories`
- **Auth**: Required (ADMIN)
- **Body**:
  ```json
  {
    "name": "string",
    "nameAr": "string",
    "icon": "string (optional)",
    "description": "string (optional)",
    "image": "string (optional)"
  }
  ```
- **Response**: `{ success: true, category: {...} }`

### Update Category (Admin Only)
- **PATCH** `/categories/:id`
- **Auth**: Required (ADMIN)
- **Body**: Same as create (all fields optional)
- **Response**: `{ success: true, category: {...} }`

### Delete Category (Admin Only)
- **DELETE** `/categories/:id`
- **Auth**: Required (ADMIN)
- **Response**: `{ success: true, message: "..." }`

---

## Reviews Endpoints

### Get All Reviews
- **GET** `/reviews`
- **Query Params**: `venueId`, `serviceId`, `userId`, `limit`, `offset`
- **Response**: `{ success: true, reviews: [...], total: number }`

### Create Review
- **POST** `/reviews`
- **Auth**: Required
- **Body**:
  ```json
  {
    "venueId": "string (optional)",
    "serviceId": "string (optional)",
    "rating": number (1-5),
    "comment": "string (optional)"
  }
  ```
- **Response**: `{ success: true, review: {...} }`

### Delete Review
- **DELETE** `/reviews/:id`
- **Auth**: Required (Owner or Admin)
- **Response**: `{ success: true, message: "..." }`

---

## Admin Endpoints

All admin endpoints require authentication and ADMIN role.

### Dashboard Stats
- **GET** `/admin/stats`
- **Response**: `{ success: true, stats: {...} }`

### Users Management
- **GET** `/admin/users` - Get all users
- **PATCH** `/admin/users/:id/status` - Update user status
- **DELETE** `/admin/users/:id` - Delete user

### Venues Management
- **GET** `/admin/venues` - Get all venues
- **PATCH** `/admin/venues/:id/status` - Update venue status
- **DELETE** `/admin/venues/:id` - Delete venue

### Services Management
- **GET** `/admin/services` - Get all services
- **PATCH** `/admin/services/:id/status` - Update service status
- **DELETE** `/admin/services/:id` - Delete service

### Bookings Management
- **GET** `/admin/bookings` - Get all bookings
- **PATCH** `/admin/bookings/:id/status` - Update booking status
- **PATCH** `/admin/bookings/:id/payment-status` - Update payment status

### Categories Management
- **GET** `/admin/categories` - Get all categories

### Reviews Management
- **GET** `/admin/reviews` - Get all reviews
- **DELETE** `/admin/reviews/:id` - Delete review

### Payments Management
- **GET** `/admin/payments` - Get all payments
- **PATCH** `/admin/payments/:id/status` - Update payment status

---

## Reports Endpoints

All report endpoints require authentication and ADMIN role.

### Get All Reports
- **GET** `/reports`
- **Query Params**: `status`, `type`, `limit`, `offset`
- **Response**: `{ success: true, reports: [...], total: number }`

### Get Report by ID
- **GET** `/reports/:id`
- **Response**: `{ success: true, report: {...} }`

### Generate Report
- **POST** `/reports/generate`
- **Body**:
  ```json
  {
    "type": "USERS | BOOKINGS | VENUES | SERVICES | PAYMENTS | REVIEWS | CATEGORIES | CUSTOM",
    "resource": "users | bookings | venues | services | payments | reviews | categories",
    "filters": {},
    "format": "PDF | CSV | EXCEL"
  }
  ```
- **Response**: `{ success: true, report: {...}, message: "..." }`

### Download Report
- **GET** `/reports/:id/download`
- **Response**: File download

### Delete Report
- **DELETE** `/reports/:id`
- **Response**: `{ success: true, message: "..." }`

---

## Health Check

### API Health
- **GET** `/health`
- **Response**: `{ status: "OK", message: "...", timestamp: "...", version: "..." }`

---

## Swagger Documentation

Interactive API documentation is available at:
```
http://localhost:5000/api-docs
```

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE (optional)"
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error


