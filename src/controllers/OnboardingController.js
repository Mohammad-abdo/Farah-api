const getPrisma = require('../utils/prisma');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { getFileUrl, deleteOldFile } = require('../utils/upload');

const prisma = getPrisma();

class OnboardingController {
  /**
   * Get all onboarding slides
   * GET /api/onboarding
   */
  static async getAll(req, res, next) {
    try {
      const slides = await prisma.onboardingSlide.findMany({
        orderBy: {
          order: 'asc',
        },
      });

      res.json({
        success: true,
        slides,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active onboarding slides (for mobile app)
   * GET /api/mobile/onboarding
   */
  static async getActive(req, res, next) {
    try {
      const slides = await prisma.onboardingSlide.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          order: 'asc',
        },
      });

      res.json({
        success: true,
        slides,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get onboarding slide by ID
   * GET /api/onboarding/:id
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const slide = await prisma.onboardingSlide.findUnique({
        where: { id },
      });

      if (!slide) {
        throw new NotFoundError('Onboarding slide');
      }

      res.json({
        success: true,
        slide,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create onboarding slide
   * POST /api/onboarding
   */
  static async create(req, res, next) {
    try {
      const { title, titleAr, subtitle, subtitleAr, image, order, isActive } = req.body;

      if (!title || !titleAr) {
        throw new ValidationError('Title and Arabic title are required');
      }

      // Handle file upload (new method - preferred)
      let imageUrl = null;
      if (req.file) {
        const imagePath = `/uploads/onboarding/${req.file.filename}`;
        imageUrl = getFileUrl(req, imagePath);
        console.log('Onboarding slide image uploaded as file:', imageUrl);
      } else if (image && image.trim() !== '') {
        // Fallback to base64 for backward compatibility
        imageUrl = image;
      }

      if (!imageUrl || imageUrl.trim() === '') {
        throw new ValidationError('Image is required');
      }

      const slide = await prisma.onboardingSlide.create({
        data: {
          title: title.trim(),
          titleAr: titleAr.trim(),
          subtitle: subtitle && subtitle.trim() !== '' ? subtitle.trim() : null,
          subtitleAr: subtitleAr && subtitleAr.trim() !== '' ? subtitleAr.trim() : null,
          image: imageUrl,
          order: parseInt(order) || 0,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });

      res.status(201).json({
        success: true,
        slide,
      });
    } catch (error) {
      console.error('Error creating onboarding slide:', error);
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Update onboarding slide
   * PUT /api/onboarding/:id
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { title, titleAr, subtitle, subtitleAr, image, order, isActive } = req.body;

      const slide = await prisma.onboardingSlide.findUnique({
        where: { id },
      });

      if (!slide) {
        throw new NotFoundError('Onboarding slide');
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title.trim();
      if (titleAr !== undefined) updateData.titleAr = titleAr.trim();
      if (subtitle !== undefined) updateData.subtitle = subtitle && subtitle.trim() !== '' ? subtitle.trim() : null;
      if (subtitleAr !== undefined) updateData.subtitleAr = subtitleAr && subtitleAr.trim() !== '' ? subtitleAr.trim() : null;
      if (order !== undefined) updateData.order = parseInt(order) || 0;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);

      // Handle file upload (new method - preferred)
      if (req.file) {
        // Delete old image file
        if (slide.image && slide.image.startsWith('/uploads/')) {
          deleteOldFile(slide.image);
        }
        const imagePath = `/uploads/onboarding/${req.file.filename}`;
        updateData.image = getFileUrl(req, imagePath);
        console.log('Onboarding slide image updated as file:', updateData.image);
      } else if (image !== undefined) {
        // Fallback to base64
        if (image === null || image === '') {
          if (slide.image && slide.image.startsWith('/uploads/')) {
            deleteOldFile(slide.image);
          }
          updateData.image = null;
        } else {
          updateData.image = image;
        }
      }

      const updatedSlide = await prisma.onboardingSlide.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        slide: updatedSlide,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Delete onboarding slide
   * DELETE /api/onboarding/:id
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const slide = await prisma.onboardingSlide.findUnique({
        where: { id },
      });

      if (!slide) {
        throw new NotFoundError('Onboarding slide');
      }

      await prisma.onboardingSlide.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Onboarding slide deleted successfully',
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
}

module.exports = OnboardingController;

