# Backend-Frontend Connection Guide

## Prerequisites

1. **Database Setup**
   - Make sure MySQL is running
   - Create a database (e.g., `farah_db`)
   - Update `DATABASE_URL` in `.env` file

2. **Environment Variables**
   - Copy `.env.example` to `.env`
   - Update the values in `.env` file

## Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Setup Database**
   ```bash
   # Generate Prisma Client
   npm run prisma:generate

   # Run Migrations
   npm run prisma:migrate

   # Seed Database
   npm run seed
   ```

3. **Start Backend Server**
   ```bash
   npm run dev
   ```

   The server will run on `http://localhost:5000`

## Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Variables**
   - Create `.env` file in `frontend` directory
   - Add: `VITE_API_URL=http://localhost:5000/api`

3. **Start Frontend Server**
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:3000` (or another port)

## Default Login Credentials

After running seed:

**Admin:**
- Phone: `+201000000000`
- Password: `admin123`

**Customer:**
- Phone: `+201234567890`
- Password: `customer123`

**Provider:**
- Phone: `+201234567891`
- Password: `provider123`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Venues
- `GET /api/venues` - Get all venues
- `GET /api/venues/:id` - Get venue by ID
- `GET /api/venues/top?limit=5` - Get top venues
- `GET /api/venues/popular?limit=5` - Get popular venues

### Services
- `GET /api/services` - Get all services
- `GET /api/services/:id` - Get service by ID

### Categories
- `GET /api/categories` - Get all categories

### Bookings
- `GET /api/bookings` - Get all bookings (requires auth)
- `GET /api/bookings/:id` - Get booking by ID (requires auth)
- `POST /api/bookings` - Create booking (requires auth)

### Admin (requires ADMIN role)
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/venues` - Get all venues
- `GET /api/admin/services` - Get all services
- `GET /api/admin/bookings` - Get all bookings
- `GET /api/admin/categories` - Get all categories
- `GET /api/admin/reviews` - Get all reviews
- `GET /api/admin/payments` - Get all payments

### Reports
- `GET /api/reports` - Get all reports (requires auth)
- `POST /api/reports/generate` - Generate report (requires auth)
- `GET /api/reports/:id/download` - Download report (requires auth)
- `DELETE /api/reports/:id` - Delete report (requires auth)

## Testing Connection

1. **Backend Health Check**
   ```bash
   curl http://localhost:5000/api/health
   ```
   Should return: `{"status":"OK","message":"Farah API is running"}`

2. **Frontend API Test**
   - Open browser console
   - Check network tab for API calls
   - Verify requests are going to `http://localhost:5000/api`

## Troubleshooting

### Backend not connecting
- Check if MySQL is running
- Verify `DATABASE_URL` in `.env` is correct
- Check if port 5000 is available
- Look at backend console for errors

### Frontend not connecting to backend
- Verify `VITE_API_URL` in frontend `.env`
- Check CORS settings in backend
- Verify backend is running
- Check browser console for errors

### Database errors
- Run `npm run prisma:generate` to regenerate Prisma Client
- Run `npm run prisma:migrate` to apply migrations
- Check database connection string



