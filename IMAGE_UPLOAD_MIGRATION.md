# Image Upload Migration Complete

## Summary

All image storage in the backend has been migrated from base64 strings to file uploads. Images are now stored as files in the `uploads/` directory and URLs are saved in the database.

## Changes Made

### 1. Upload Utility (`backend/src/utils/upload.js`)
- Created unified upload system supporting multiple image types
- Separate multer instances for: users, categories, venues, services, sliders, settings, onboarding, coupons
- Helper functions: `getFileUrl()` and `deleteOldFile()`
- Automatic directory creation

### 2. Routes Updated
- **Categories**: `/api/categories` - POST, PATCH (icon, image fields)
- **Venues**: `/api/admin/venues` - POST, PUT (images array)
- **Services**: `/api/admin/services` - POST, PUT (images array)
- **Sliders**: `/api/sliders` - POST, PATCH (image field)
- **Settings**: `/api/settings` - PATCH (appLogo, dashboardLogo, favicon)
- **Onboarding**: `/api/onboarding` - POST, PUT (image field)
- **User Profile**: `/api/mobile/profile` - PATCH (avatar field) - Already updated

### 3. Controllers Updated
All controllers now:
- Handle file uploads via `req.file` or `req.files`
- Generate full URLs using `getFileUrl()`
- Delete old files when updating
- Support base64 fallback for backward compatibility

### 4. Directory Structure
```
backend/uploads/
├── users/
│   └── avatars/
├── categories/
├── venues/
├── services/
├── sliders/
├── settings/
├── onboarding/
└── coupons/
```

## Environment Variables

Add to `.env`:
```env
BASE_URL=https://back.dr-law.site
# OR for local development:
# BASE_URL=http://localhost:5000
```

## File Upload Format

### Single Image (e.g., avatar, slider, onboarding)
```javascript
// Frontend
const formData = new FormData();
formData.append('image', file);
// or
formData.append('avatar', file);

// Backend receives: req.file
```

### Multiple Images (e.g., venues, services)
```javascript
// Frontend
const formData = new FormData();
files.forEach(file => {
  formData.append('images', file);
});

// Backend receives: req.files.images (array)
```

### Multiple Named Fields (e.g., settings)
```javascript
// Frontend
const formData = new FormData();
formData.append('appLogo', logoFile);
formData.append('dashboardLogo', dashboardLogoFile);
formData.append('favicon', faviconFile);

// Backend receives: req.files.appLogo[0], req.files.dashboardLogo[0], etc.
```

## URL Format

Images are stored with full URLs:
- Production: `https://back.dr-law.site/uploads/categories/category_1234567890_abc123.jpg`
- Local: `http://localhost:5000/uploads/categories/category_1234567890_abc123.jpg`

## Backward Compatibility

- Old base64 images still work (fallback)
- New uploads use file system
- Old files are deleted when replaced

## Testing

1. Restart backend server
2. Upload images via API endpoints
3. Verify files are created in `uploads/` directory
4. Verify URLs are stored in database
5. Verify images are accessible via URLs

## Next Steps

1. Update frontend to use `FormData` for all image uploads
2. Remove base64 image handling from frontend (optional, for cleaner code)
3. Migrate existing base64 images to files (optional migration script)

















