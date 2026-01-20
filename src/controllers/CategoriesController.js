const getPrisma = require('../utils/prisma');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { getFileUrl, deleteOldFile } = require('../utils/upload');
const fs = require('fs');
const path = require('path');

const prisma = getPrisma();

class CategoriesController {
  /**
   * Get all categories
   */
  static async getAll(req, res, next) {
    try {
      const categories = await prisma.category.findMany({
        orderBy: {
          nameAr: 'asc',
        },
        include: {
          _count: {
            select: {
              services: true,
            },
          },
        },
      });

      res.json({
        success: true,
        categories,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category by ID
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          services: {
            where: {
              isActive: true,
            },
            take: 10,
            orderBy: {
              rating: 'desc',
            },
          },
          _count: {
            select: {
              services: true,
            },
          },
        },
      });

      if (!category) {
        throw new NotFoundError('Category');
      }

      res.json({
        success: true,
        category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create category (Admin only)
   */
  static async create(req, res, next) {
    try {
      const { name, nameAr, description } = req.body;

      if (!name || !nameAr) {
        throw new ValidationError('Name and nameAr are required');
      }

      // Handle file uploads
      let iconUrl = null;
      let imageUrl = null;

      if (req.files) {
        // Handle icon file
        if (req.files.icon && req.files.icon[0]) {
          const iconFile = req.files.icon[0];
          const iconPath = `/uploads/categories/${iconFile.filename}`;
          iconUrl = getFileUrl(req, iconPath);
          console.log('Category icon uploaded:', iconUrl);
        } else if (req.body.icon) {
          // Fallback to base64 for backward compatibility
          iconUrl = req.body.icon;
        }

        // Handle image file
        if (req.files.image && req.files.image[0]) {
          const imageFile = req.files.image[0];
          const imagePath = `/uploads/categories/${imageFile.filename}`;
          imageUrl = getFileUrl(req, imagePath);
          console.log('Category image uploaded:', imageUrl);
        } else if (req.body.image) {
          // Fallback to base64 for backward compatibility
          imageUrl = req.body.image;
        }
      } else {
        // No files uploaded, use body values (base64 fallback)
        iconUrl = req.body.icon || null;
        imageUrl = req.body.image || null;
      }

      const category = await prisma.category.create({
        data: {
          name,
          nameAr,
          icon: iconUrl,
          description: description || null,
          image: imageUrl,
        },
      });

      res.status(201).json({
        success: true,
        category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update category (Admin only)
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, nameAr, description } = req.body;

      // Get existing category to delete old files
      const existingCategory = await prisma.category.findUnique({
        where: { id },
        select: { icon: true, image: true }
      });

      const updateData = {};
      if (name) updateData.name = name;
      if (nameAr) updateData.nameAr = nameAr;
      if (description !== undefined) updateData.description = description || null;

      // Handle file uploads
      if (req.files) {
        // Handle icon file
        if (req.files.icon && req.files.icon[0]) {
          // Delete old icon file
          if (existingCategory?.icon) {
            deleteOldFile(existingCategory.icon);
          }
          const iconFile = req.files.icon[0];
          const iconPath = `/uploads/categories/${iconFile.filename}`;
          updateData.icon = getFileUrl(req, iconPath);
          console.log('Category icon updated:', updateData.icon);
        } else if (req.body.icon !== undefined) {
          // If icon is explicitly set to null or provided as base64
          if (req.body.icon === null || req.body.icon === '') {
            if (existingCategory?.icon) {
              deleteOldFile(existingCategory.icon);
            }
            updateData.icon = null;
          } else if (req.body.icon) {
            updateData.icon = req.body.icon; // Base64 fallback
          }
        }

        // Handle image file
        if (req.files.image && req.files.image[0]) {
          // Delete old image file
          if (existingCategory?.image) {
            deleteOldFile(existingCategory.image);
          }
          const imageFile = req.files.image[0];
          const imagePath = `/uploads/categories/${imageFile.filename}`;
          updateData.image = getFileUrl(req, imagePath);
          console.log('Category image updated:', updateData.image);
        } else if (req.body.image !== undefined) {
          // If image is explicitly set to null or provided as base64
          if (req.body.image === null || req.body.image === '') {
            if (existingCategory?.image) {
              deleteOldFile(existingCategory.image);
            }
            updateData.image = null;
          } else if (req.body.image) {
            updateData.image = req.body.image; // Base64 fallback
          }
        }
      } else {
        // No files, use body values
        if (req.body.icon !== undefined) {
          if (req.body.icon === null || req.body.icon === '') {
            if (existingCategory?.icon) {
              deleteOldFile(existingCategory.icon);
            }
            updateData.icon = null;
          } else {
            updateData.icon = req.body.icon;
          }
        }
        if (req.body.image !== undefined) {
          if (req.body.image === null || req.body.image === '') {
            if (existingCategory?.image) {
              deleteOldFile(existingCategory.image);
            }
            updateData.image = null;
          } else {
            updateData.image = req.body.image;
          }
        }
      }

      const category = await prisma.category.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete category (Admin only)
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      await prisma.category.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CategoriesController;

