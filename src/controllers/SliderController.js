const getPrisma = require('../utils/prisma');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { getFileUrl, deleteOldFile } = require('../utils/upload');

const prisma = getPrisma();

class SliderController {
  /**
   * Get all sliders
   */
  static async getAll(req, res, next) {
    try {
      const { isActive } = req.query;

      const where = {
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
      };

      const sliders = await prisma.slider.findMany({
        where,
        orderBy: { order: 'asc' },
      });

      res.json({
        success: true,
        sliders,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get slider by ID
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const slider = await prisma.slider.findUnique({
        where: { id },
      });

      if (!slider) {
        throw new NotFoundError('Slider');
      }

      res.json({
        success: true,
        slider,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create slider
   */
  static async create(req, res, next) {
    try {
      const { title, titleAr, description, descriptionAr, image, imageUrl, link, order, isActive } = req.body;

      // Handle file upload (new method - preferred)
      let imageValue = null;
      if (req.file) {
        const imagePath = `/uploads/sliders/${req.file.filename}`;
        imageValue = getFileUrl(req, imagePath);
        console.log('Slider image uploaded as file:', imageValue);
      } else {
        // Fallback to base64 for backward compatibility
        imageValue = imageUrl || image;
      }

      if (!imageValue || imageValue.trim() === '') {
        throw new ValidationError('Image is required');
      }

      // No size limit - accept any image size
      // Accept any image extension (jpg, jpeg, png, gif, webp, svg, etc.)

      const slider = await prisma.slider.create({
        data: {
          title: title && title.trim() !== '' ? title : null,
          titleAr: titleAr && titleAr.trim() !== '' ? titleAr : null,
          description: description && description.trim() !== '' ? description : null,
          descriptionAr: descriptionAr && descriptionAr.trim() !== '' ? descriptionAr : null,
          image: imageValue,
          link: link && link.trim() !== '' ? link : null,
          order: parseInt(order) || 0,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });

      res.status(201).json({
        success: true,
        slider,
      });
    } catch (error) {
      console.error('❌ Error creating slider:', error);
      console.error('Error name:', error.name);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      if (error.meta) {
        console.error('Error meta:', error.meta);
      }
      
      // Log request body (but truncate image if it's too long)
      const logBody = { ...req.body };
      if (logBody.image && logBody.image.length > 100) {
        logBody.image = logBody.image.substring(0, 100) + '... (truncated)';
      }
      if (logBody.imageUrl && logBody.imageUrl.length > 100) {
        logBody.imageUrl = logBody.imageUrl.substring(0, 100) + '... (truncated)';
      }
      console.error('Request body (truncated):', JSON.stringify(logBody, null, 2));
      
      // Handle Prisma validation errors
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          error: 'A slider with this data already exists'
        });
      }
      
      if (error.code === 'P2003') {
        return res.status(400).json({
          success: false,
          error: 'Invalid data provided'
        });
      }
      
      // Handle database connection errors
      if (error.code === 'P1017' || error.code === 'P1001' || error.code === 'P1008') {
        console.error('Database connection error:', error.code);
        return res.status(500).json({
          success: false,
          error: 'Database connection error. Please check your database connection and try again.'
        });
      }
      
      // Handle validation errors
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      
      // Generic error response
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create slider. Please try again.'
      });
    }
  }

  /**
   * Update slider
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { title, titleAr, description, descriptionAr, image, imageUrl, link, order, isActive } = req.body;

      const slider = await prisma.slider.findUnique({
        where: { id },
      });

      if (!slider) {
        throw new NotFoundError('Slider');
      }

      // Handle file upload (new method - preferred)
      const updateData = {};
      if (title !== undefined) updateData.title = title || null;
      if (titleAr !== undefined) updateData.titleAr = titleAr || null;
      if (description !== undefined) updateData.description = description || null;
      if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr || null;
      if (link !== undefined) updateData.link = link || null;
      if (order !== undefined) updateData.order = order;
      if (isActive !== undefined) updateData.isActive = isActive;

      if (req.file) {
        // Delete old image file
        if (slider.image && slider.image.startsWith('/uploads/')) {
          deleteOldFile(slider.image);
        }
        const imagePath = `/uploads/sliders/${req.file.filename}`;
        updateData.image = getFileUrl(req, imagePath);
        console.log('Slider image updated as file:', updateData.image);
      } else if (imageUrl !== undefined || image !== undefined) {
        // Fallback to base64
        const imageValue = imageUrl !== undefined ? imageUrl : image;
        if (imageValue === null || imageValue === '') {
          if (slider.image && slider.image.startsWith('/uploads/')) {
            deleteOldFile(slider.image);
          }
          updateData.image = null;
        } else {
          updateData.image = imageValue;
        }
      }

      const updated = await prisma.slider.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        slider: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete slider
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const slider = await prisma.slider.findUnique({
        where: { id },
      });

      if (!slider) {
        throw new NotFoundError('Slider');
      }

      await prisma.slider.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Slider deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SliderController;

