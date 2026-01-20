# CRUD Operations Summary

This document lists all CRUD (Create, Read, Update, Delete) operations available in the admin dashboard.

## Users Management (`/api/admin/users`)

- ✅ **GET** `/api/admin/users` - List all users (with search and role filter)
- ✅ **PATCH** `/api/admin/users/:id` - Update user (name, email, phone, role, location, isActive)
- ✅ **DELETE** `/api/admin/users/:id` - Delete user (prevents self-deletion)

## Venues Management (`/api/admin/venues`)

- ✅ **GET** `/api/admin/venues` - List all venues (with search)
- ✅ **PATCH** `/api/admin/venues/:id/status` - Toggle venue active status
- ✅ **DELETE** `/api/admin/venues/:id` - Delete venue

## Services Management (`/api/admin/services`)

- ✅ **GET** `/api/admin/services` - List all services (with search)
- ✅ **PATCH** `/api/admin/services/:id/status` - Toggle service active status
- ✅ **DELETE** `/api/admin/services/:id` - Delete service

## Bookings Management (`/api/admin/bookings`)

- ✅ **GET** `/api/admin/bookings` - List all bookings (with search, status, paymentStatus filters)
- ✅ **GET** `/api/admin/bookings/:id` - Get single booking details
- ✅ **PATCH** `/api/admin/bookings/:id/status` - Update booking status
- ✅ **PATCH** `/api/admin/bookings/:id/payment-status` - Update booking payment status

## Categories Management (`/api/admin/categories`)

- ✅ **GET** `/api/admin/categories` - List all categories (with search)
- ✅ **POST** `/api/admin/categories` - Create new category
- ✅ **PATCH** `/api/admin/categories/:id` - Update category
- ✅ **DELETE** `/api/admin/categories/:id` - Delete category

## Reviews Management (`/api/admin/reviews`)

- ✅ **GET** `/api/admin/reviews` - List all reviews (with search and rating filter)
- ✅ **DELETE** `/api/admin/reviews/:id` - Delete review

## Payments Management (`/api/admin/payments`)

- ✅ **GET** `/api/admin/payments` - List all payments (with search, status, method filters)
- ✅ **PATCH** `/api/admin/payments/:id/status` - Update payment status

## Reports Management (`/api/reports`)

- ✅ **GET** `/api/reports` - List all reports
- ✅ **GET** `/api/reports/:id` - Get single report details
- ✅ **POST** `/api/reports/generate` - Generate new report
- ✅ **GET** `/api/reports/:id/download` - Download report file (PDF/CSV)
- ✅ **DELETE** `/api/reports/:id` - Delete report

## Dashboard Stats (`/api/admin/stats`)

- ✅ **GET** `/api/admin/stats` - Get dashboard statistics

## Permissions Management (`/api/admin/permissions`)

- ✅ **GET** `/api/admin/permissions` - List all permissions
- ✅ **GET** `/api/admin/roles/:role/permissions` - Get permissions for a role

---

## Frontend Pages CRUD Status

### Users Page (`/admin/users`)
- ✅ Read (List with search and role filter)
- ✅ Update (Edit user modal)
- ✅ Delete (Delete button)
- ✅ Toggle Active Status

### Venues Page (`/admin/venues`)
- ✅ Read (List with search)
- ✅ Update Status (Toggle active/inactive)
- ✅ Delete

### Services Page (`/admin/services`)
- ✅ Read (List with search)
- ✅ Update Status (Toggle active/inactive)
- ✅ Delete

### Bookings Page (`/admin/bookings`)
- ✅ Read (List with filters)
- ✅ Read Details (Modal view)
- ✅ Update Status
- ✅ Update Payment Status
- ✅ Generate Report

### Categories Page (`/admin/categories`)
- ✅ Read (List with search)
- ✅ Create (Add new category)
- ✅ Update (Edit category)
- ✅ Delete
- ✅ Generate Report

### Reviews Page (`/admin/reviews`)
- ✅ Read (List with search and rating filter)
- ✅ Delete
- ✅ Generate Report

### Payments Page (`/admin/payments`)
- ✅ Read (List with filters)
- ✅ Update Status
- ✅ Generate Report

### Reports Page (`/admin/reports`)
- ✅ Read (List all reports)
- ✅ Create (Generate new report)
- ✅ Download (PDF/CSV)
- ✅ Delete

---

## Notes

1. All admin routes require authentication (`authenticate` middleware)
2. All admin routes require ADMIN role (`requireRole('ADMIN')` middleware)
3. Reports are generated asynchronously and stored in `/backend/reports` directory
4. All delete operations include confirmation dialogs in the frontend
5. Search functionality is available on all list pages
6. Filtering capabilities vary by resource type



