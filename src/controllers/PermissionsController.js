const getPrisma = require('../utils/prisma');
const { NotFoundError, ValidationError } = require('../utils/errors');

const prisma = getPrisma();

class PermissionsController {
  /**
   * Get all permissions
   */
  static async getAll(req, res, next) {
    try {
      const { resource, action, search, limit = 100, offset = 0 } = req.query;

      const where = {
        ...(resource && { resource }),
        ...(action && { action }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
            { resource: { contains: search } },
            { action: { contains: search } },
          ],
        }),
      };

      const [permissions, total] = await Promise.all([
        prisma.permission.findMany({
          where,
          include: {
            _count: {
              select: { rolePermissions: true },
            },
          },
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: [
            { resource: 'asc' },
            { action: 'asc' },
          ],
        }),
        prisma.permission.count({ where }),
      ]);

      res.json({
        success: true,
        permissions,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get permission by ID
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const permission = await prisma.permission.findUnique({
        where: { id },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!permission) {
        throw new NotFoundError('Permission');
      }

      res.json({
        success: true,
        permission,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create permission
   */
  static async create(req, res, next) {
    try {
      const { name, description, resource, action } = req.body;

      // Validation
      if (!name || !resource || !action) {
        throw new ValidationError('Name, resource, and action are required');
      }

      // Check if permission already exists
      const existing = await prisma.permission.findUnique({
        where: { name },
      });

      if (existing) {
        throw new ValidationError('Permission with this name already exists');
      }

      const permission = await prisma.permission.create({
        data: {
          name,
          description,
          resource,
          action,
        },
      });

      res.status(201).json({
        success: true,
        permission,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update permission
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, resource, action } = req.body;

      // Check if permission exists
      const existing = await prisma.permission.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundError('Permission');
      }

      // Check if name is being changed and if new name exists
      if (name && name !== existing.name) {
        const nameExists = await prisma.permission.findUnique({
          where: { name },
        });
        if (nameExists) {
          throw new ValidationError('Permission with this name already exists');
        }
      }

      const permission = await prisma.permission.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(resource && { resource }),
          ...(action && { action }),
        },
      });

      res.json({
        success: true,
        permission,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete permission
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const permission = await prisma.permission.findUnique({
        where: { id },
      });

      if (!permission) {
        throw new NotFoundError('Permission');
      }

      await prisma.permission.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Permission deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get permissions by resource
   */
  static async getByResource(req, res, next) {
    try {
      const { resource } = req.params;

      const permissions = await prisma.permission.findMany({
        where: { resource },
        orderBy: { action: 'asc' },
      });

      res.json({
        success: true,
        permissions,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PermissionsController;


