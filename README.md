# Farah Backend API

Backend API server for the Farah application built with Express.js, Prisma ORM, and MySQL.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database
DATABASE_URL="mysql://root:your_password@localhost:3306/farah_db?schema=public"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Server Port
PORT=5000

# Environment
NODE_ENV=development
```

**Important:** Replace `your_password` with your actual MySQL root password and ensure the database `farah_db` exists.

### 3. Database Setup

1. Make sure MySQL is running
2. Create the database:
   ```sql
   CREATE DATABASE farah_db;
   ```
3. Run Prisma migrations:
   ```bash
   npm run prisma:migrate
   ```
4. Generate Prisma Client:
   ```bash
   npm run prisma:generate
   ```
5. (Optional) Seed the database:
   ```bash
   npm run seed
   ```

### 4. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will run on `http://localhost:5000` by default.

## API Endpoints

### Health Check
- `GET /api/health` - Check if API is running

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with phone/password
- `POST /api/auth/otp/send` - Send OTP to phone number
- `POST /api/auth/otp/verify` - Verify OTP and login/register

### Categories (`/api/categories`)
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get single category with services

### Venues (`/api/venues`)
- `GET /api/venues` - Get all venues (with search, limit, offset)
- `GET /api/venues/top?limit=5` - Get top rated venues
- `GET /api/venues/popular?limit=5` - Get most popular venues
- `GET /api/venues/:id` - Get single venue with reviews

### Services (`/api/services`)
- `GET /api/services` - Get all services (with categoryId, search, limit, offset)
- `GET /api/services/category/:categoryId` - Get services by category
- `GET /api/services/:id` - Get single service with reviews

### Bookings (`/api/bookings`)
- `GET /api/bookings` - Get all bookings (with userId, status, limit, offset)
- `POST /api/bookings` - Create a new booking
- `GET /api/bookings/:id` - Get single booking details
- `PATCH /api/bookings/:id/status` - Update booking status

## Scripts

- `npm start` - Start the server
- `npm run dev` - Start in development mode with nodemon
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run seed` - Seed the database with sample data

## Project Structure

```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   ├── bookings.js      # Booking routes
│   │   ├── categories.js    # Category routes
│   │   ├── services.js      # Service routes
│   │   └── venues.js         # Venue routes
│   └── server.js            # Main server file
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── seed.js              # Database seed script
│   └── migrations/         # Database migrations
├── .env                     # Environment variables (create this)
├── package.json
└── README.md
```

## Dependencies

### Production
- `express` - Web framework
- `@prisma/client` - Prisma ORM client
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `cors` - CORS middleware
- `dotenv` - Environment variable management

### Development
- `nodemon` - Auto-reload for development
- `prisma` - Prisma CLI

## Troubleshooting

### Database Connection Issues
See `FIX_MYSQL.md` for detailed troubleshooting steps.

### Port Already in Use
Change the `PORT` in `.env` file or kill the process using port 5000.

### Prisma Errors
1. Make sure MySQL is running
2. Check your `DATABASE_URL` in `.env`
3. Run `npm run prisma:generate` after schema changes
4. Run `npm run prisma:migrate` to apply migrations
