const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Permission definitions for the application
 */
const PERMISSIONS = {
  // User permissions
  USERS_READ: { resource: 'users', action: 'read' },
  USERS_CREATE: { resource: 'users', action: 'create' },
  USERS_UPDATE: { resource: 'users', action: 'update' },
  USERS_DELETE: { resource: 'users', action: 'delete' },
  
  // Venue permissions
  VENUES_READ: { resource: 'venues', action: 'read' },
  VENUES_CREATE: { resource: 'venues', action: 'create' },
  VENUES_UPDATE: { resource: 'venues', action: 'update' },
  VENUES_DELETE: { resource: 'venues', action: 'delete' },
  VENUES_APPROVE: { resource: 'venues', action: 'approve' },
  
  // Service permissions
  SERVICES_READ: { resource: 'services', action: 'read' },
  SERVICES_CREATE: { resource: 'services', action: 'create' },
  SERVICES_UPDATE: { resource: 'services', action: 'update' },
  SERVICES_DELETE: { resource: 'services', action: 'delete' },
  SERVICES_APPROVE: { resource: 'services', action: 'approve' },
  
  // Booking permissions
  BOOKINGS_READ: { resource: 'bookings', action: 'read' },
  BOOKINGS_CREATE: { resource: 'bookings', action: 'create' },
  BOOKINGS_UPDATE: { resource: 'bookings', action: 'update' },
  BOOKINGS_DELETE: { resource: 'bookings', action: 'delete' },
  BOOKINGS_CANCEL: { resource: 'bookings', action: 'cancel' },
  
  // Category permissions
  CATEGORIES_READ: { resource: 'categories', action: 'read' },
  CATEGORIES_CREATE: { resource: 'categories', action: 'create' },
  CATEGORIES_UPDATE: { resource: 'categories', action: 'update' },
  CATEGORIES_DELETE: { resource: 'categories', action: 'delete' },
  
  // Review permissions
  REVIEWS_READ: { resource: 'reviews', action: 'read' },
  REVIEWS_CREATE: { resource: 'reviews', action: 'create' },
  REVIEWS_UPDATE: { resource: 'reviews', action: 'update' },
  REVIEWS_DELETE: { resource: 'reviews', action: 'delete' },
  
  // Payment permissions
  PAYMENTS_READ: { resource: 'payments', action: 'read' },
  PAYMENTS_UPDATE: { resource: 'payments', action: 'update' },
  
  // Admin permissions
  ADMIN_DASHBOARD: { resource: 'admin', action: 'dashboard' },
  ADMIN_STATS: { resource: 'admin', action: 'stats' },
  ADMIN_SETTINGS: { resource: 'admin', action: 'settings' },
};

/**
 * Role-based permission mappings
 */
const ROLE_PERMISSIONS = {
  ADMIN: [
    // Admin has all permissions
    ...Object.values(PERMISSIONS)
  ],
  PROVIDER: [
    PERMISSIONS.VENUES_READ,
    PERMISSIONS.VENUES_CREATE,
    PERMISSIONS.VENUES_UPDATE,
    PERMISSIONS.SERVICES_READ,
    PERMISSIONS.SERVICES_CREATE,
    PERMISSIONS.SERVICES_UPDATE,
    PERMISSIONS.BOOKINGS_READ,
    PERMISSIONS.REVIEWS_READ,
  ],
  CUSTOMER: [
    PERMISSIONS.VENUES_READ,
    PERMISSIONS.SERVICES_READ,
    PERMISSIONS.BOOKINGS_READ,
    PERMISSIONS.BOOKINGS_CREATE,
    PERMISSIONS.BOOKINGS_UPDATE,
    PERMISSIONS.REVIEWS_READ,
    PERMISSIONS.REVIEWS_CREATE,
  ],
};

/**
 * Initialize permissions in database
 */
async function initializePermissions() {
  try {
    // Create all permissions
    for (const [key, permission] of Object.entries(PERMISSIONS)) {
      await prisma.permission.upsert({
        where: { name: key },
        update: {
          resource: permission.resource,
          action: permission.action,
          description: `${permission.action} ${permission.resource}`
        },
        create: {
          name: key,
          resource: permission.resource,
          action: permission.action,
          description: `${permission.action} ${permission.resource}`
        }
      });
    }

    // Assign permissions to roles
    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      for (const permission of permissions) {
        // Find permission by matching resource and action
        const perm = await prisma.permission.findFirst({
          where: {
            resource: permission.resource,
            action: permission.action
          }
        });

        if (perm) {
          await prisma.rolePermission.upsert({
            where: {
              role_permissionId: {
                role: role,
                permissionId: perm.id
              }
            },
            update: {},
            create: {
              role: role,
              permissionId: perm.id
            }
          });
        }
      }
    }

    console.log('✅ Permissions initialized successfully');
  } catch (error) {
    console.error('Error initializing permissions:', error);
    throw error;
  }
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  initializePermissions
};

