# Vendor Locations Migration

After pulling the schema changes (vendor location fields + `VendorLocation` table + vendor order location fields), run:

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration (creates vendor_locations table, adds columns to vendors and vendor_orders)
npx prisma migrate dev --name vendor_locations
```

Or apply the SQL manually from `migrations/20260308160000_vendor_locations/migration.sql` if you prefer.

## New API (Admin)

- `GET /api/admin/vendors-map?vendorType=&city=&activeOnly=` — list vendor locations for map (markers).
- `PATCH /api/admin/vendors/:id` — update vendor (including country, city, area, googleMapsLink).
- `GET /api/admin/vendors/:id/locations` — list branches.
- `POST /api/admin/vendors/:id/locations` — add branch.
- `PATCH /api/admin/vendors/:vendorId/locations/:locationId` — update branch.
- `DELETE /api/admin/vendors/:vendorId/locations/:locationId` — delete branch.
- `GET /api/admin/vendors/:vendorId/orders/:orderId` — get single order (for map with vendor/customer locations).

When creating vendor orders (e.g. from mobile/vendor app), send `vendorLocationId`, `customerLatitude`, `customerLongitude` so the admin can show vendor and customer on the map and compute distance.
