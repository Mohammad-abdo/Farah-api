# Reports System Documentation

## Overview

The Reports system allows administrators to generate and download reports for all data tables in the system. Reports can be generated in PDF or CSV format.

## Features

- Generate reports for: Users, Bookings, Venues, Services, Payments, Reviews, Categories
- Multiple formats: PDF, CSV
- Asynchronous report generation
- Download generated reports
- View report status (Pending, Generating, Completed, Failed)
- Delete reports

## Database Schema

### Report Model

```prisma
model Report {
  id          String      @id @default(uuid())
  name        String
  type        ReportType
  resource    String      // e.g., 'users', 'bookings', 'venues', etc.
  filters     Json?       // Store filter criteria as JSON
  format      ReportFormat @default(PDF)
  generatedBy String      // User ID who generated the report
  fileUrl     String?     // URL to generated report file
  status      ReportStatus @default(PENDING)
  createdAt   DateTime    @default(now())
  completedAt DateTime?

  generator   User        @relation("ReportGenerator", fields: [generatedBy], references: [id])
}
```

### Enums

- **ReportType**: USERS, BOOKINGS, VENUES, SERVICES, PAYMENTS, REVIEWS, CATEGORIES, CUSTOM
- **ReportFormat**: PDF, CSV, EXCEL
- **ReportStatus**: PENDING, GENERATING, COMPLETED, FAILED

## API Endpoints

### Generate Report
```
POST /api/reports/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "USERS",
  "resource": "users",
  "format": "PDF",
  "filters": {
    "role": "ADMIN",
    "isActive": true
  }
}
```

### Get All Reports
```
GET /api/reports?page=1&limit=20&status=COMPLETED&type=USERS
Authorization: Bearer <token>
```

### Get Single Report
```
GET /api/reports/:id
Authorization: Bearer <token>
```

### Download Report
```
GET /api/reports/:id/download
Authorization: Bearer <token>
```

### Delete Report
```
DELETE /api/reports/:id
Authorization: Bearer <token>
```

## Report Generation Process

1. **Request**: Admin clicks "Generate Report" button
2. **Create Record**: System creates a Report record with status PENDING
3. **Async Generation**: Report generation runs asynchronously
4. **Status Update**: Status changes to GENERATING → COMPLETED/FAILED
5. **File Storage**: Generated file stored in `/backend/reports` directory
6. **Download**: Admin can download the file when status is COMPLETED

## File Storage

Reports are stored in: `/backend/reports/`

File naming format: `{resource}_{timestamp}.{format}`

Example: `users_1704067200000.pdf`

## Frontend Integration

### Generate Report Button

All admin pages have a "📊 تقرير" button that:
- Navigates to `/admin/reports?generate={resource}`
- Opens the generate report form
- Pre-fills the resource type

### Reports Page

Located at `/admin/reports`, this page:
- Lists all generated reports
- Shows report status
- Allows downloading completed reports
- Allows deleting reports
- Auto-refreshes every 5 seconds to check status

## Installation

### Backend Dependencies

```bash
npm install pdfkit csv-writer
```

### Database Migration

After adding the Report model to schema.prisma:

```bash
npx prisma migrate dev --name add_reports
npx prisma generate
```

## Usage Example

### Generate Users Report

1. Navigate to `/admin/users`
2. Click "📊 تقرير" button
3. Select format (PDF or CSV)
4. Click "إنشاء"
5. Wait for status to change to "مكتمل"
6. Click "تحميل" to download

### Generate Bookings Report with Filters

1. Navigate to `/admin/bookings`
2. Apply filters (status, payment status)
3. Click "📊 تقرير" button
4. Select format
5. Generate report (filters are automatically included)

## Report Data Structure

### Users Report
- ID, Name, Email, Phone, Role, Location, Active, Created At

### Bookings Report
- ID, Booking Number, Customer, Venue, Date, Amount, Status, Payment Status, Created At

### Venues Report
- ID, Name, Name (AR), Provider, Price, Location, Rating, Active, Created At

### Services Report
- ID, Name, Name (AR), Category, Provider, Price, Rating, Active, Created At

### Payments Report
- ID, Booking Number, Amount, Method, Status, Transaction ID, Created At

### Reviews Report
- ID, User, Service/Venue, Rating, Comment, Created At

### Categories Report
- ID, Name, Name (AR), Description, Services Count, Created At

## Security

- All report routes require authentication
- All report routes require ADMIN role
- Reports are only accessible by the user who generated them (or any admin)
- File downloads are protected by authentication

## Error Handling

- Failed reports are marked with status FAILED
- Error messages are logged to console
- Frontend shows appropriate error messages
- Failed reports can be deleted and regenerated

## Future Enhancements

- Email reports to administrators
- Scheduled report generation
- Custom report templates
- Excel format support
- Report sharing
- Report history and analytics



