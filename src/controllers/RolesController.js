const getPrisma = require('../utils/prisma');
const { NotFoundError, ValidationError } = require('../utils/errors');

const prisma = getPrisma();

class RolesController {
  /**
   * Get all roles with their permissions
   */
  static async getAll(req, res, next) {
    try {
      const roles = ['ADMIN', 'PROVIDER', 'CUSTOMER'];

      const rolesWithPermissions = await Promise.all(
        roles.map(async (role) => {
          const rolePermissions = await prisma.rolePermission.findMany({
            where: { role },
            include: {
              permission: true,
            },
          });

          return {
            role,
            permissions: rolePermissions.map((rp) => rp.permission),
            permissionCount: rolePermissions.length,
          };
        })
      );

      res.json({
        success: true,
        roles: rolesWithPermissions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get role permissions
   */
  static async getRolePermissions(req, res, next) {
    try {
      const { role } = req.params;

      if (!['ADMIN', 'PROVIDER', 'CUSTOMER'].includes(role)) {
        throw new ValidationError('Invalid role');
      }

      const rolePermissions = await prisma.rolePermission.findMany({
        where: { role },
        include: {
          permission: true,
        },
        orderBy: {
          permission: {
            resource: 'asc',
          },
        },
      });

      res.json({
        success: true,
        role,
        permissions: rolePermissions.map((rp) => rp.permission),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign permissions to role
   */
  static async assignPermissions(req, res, next) {
    try {
      const { role } = req.params;
      const { permissionIds } = req.body;

      if (!['ADMIN', 'PROVIDER', 'CUSTOMER'].includes(role)) {
        throw new ValidationError('Invalid role');
      }

      if (!Array.isArray(permissionIds)) {
        throw new ValidationError('permissionIds must be an array');
      }

      // Delete existing permissions for this role
      await prisma.rolePermission.deleteMany({
        where: { role },
      });

      // Create new role permissions
      if (permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            role,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }

      // Get updated permissions
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { role },
        include: {
          permission: true,
        },
      });

      res.json({
        success: true,
        role,
        permissions: rolePermissions.map((rp) => rp.permission),
        message: 'Permissions assigned successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add permission to role
   */
  static async addPermission(req, res, next) {
    try {
      const { role } = req.params;
      const { permissionId } = req.body;

      if (!['ADMIN', 'PROVIDER', 'CUSTOMER'].includes(role)) {
        throw new ValidationError('Invalid role');
      }

      if (!permissionId) {
        throw new ValidationError('permissionId is required');
      }

      // Check if permission exists
      const permission = await prisma.permission.findUnique({
        where: { id: permissionId },
      });

      if (!permission) {
        throw new NotFoundError('Permission');
      }

      // Create role permission (skip if already exists)
      const rolePermission = await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role,
            permissionId,
          },
        },
        update: {},
        create: {
          role,
          permissionId,
        },
        include: {
          permission: true,
        },
      });

      res.json({
        success: true,
        rolePermission,
        message: 'Permission added to role successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove permission from role
   */
  static async removePermission(req, res, next) {
    try {
      const { role, permissionId } = req.params;

      if (!['ADMIN', 'PROVIDER', 'CUSTOMER'].includes(role)) {
        throw new ValidationError('Invalid role');
      }

      await prisma.rolePermission.deleteMany({
        where: {
          role,
          permissionId,
        },
      });

      res.json({
        success: true,
        message: 'Permission removed from role successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get role statistics
   */
  static async getStats(req, res, next) {
    try {
      const [adminCount, providerCount, customerCount] = await Promise.all([
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.user.count({ where: { role: 'PROVIDER' } }),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
      ]);

      const [adminPermissions, providerPermissions, customerPermissions] = await Promise.all([
        prisma.rolePermission.count({ where: { role: 'ADMIN' } }),
        prisma.rolePermission.count({ where: { role: 'PROVIDER' } }),
        prisma.rolePermission.count({ where: { role: 'CUSTOMER' } }),
      ]);

      res.json({
        success: true,
        stats: {
          roles: {
            ADMIN: { users: adminCount, permissions: adminPermissions },
            PROVIDER: { users: providerCount, permissions: providerPermissions },
            CUSTOMER: { users: customerCount, permissions: customerPermissions },
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RolesController;


