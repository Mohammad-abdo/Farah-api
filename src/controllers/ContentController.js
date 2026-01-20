const getPrisma = require('../utils/prisma');
const { NotFoundError, ValidationError } = require('../utils/errors');

const prisma = getPrisma();

class ContentController {
  /**
   * Get About content
   */
  static async getAbout(req, res, next) {
    try {
      let about = await prisma.about.findFirst();

      if (!about) {
        about = await prisma.about.create({
          data: {
            title: 'About Us',
            titleAr: 'من نحن',
            content: 'Welcome to our app...',
            contentAr: 'مرحباً بكم في تطبيقنا...',
          },
        });
      }

      res.json({
        success: true,
        about,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update About content
   */
  static async updateAbout(req, res, next) {
    try {
      const { title, titleAr, content, contentAr, isActive } = req.body;

      let about = await prisma.about.findFirst();

      if (!about) {
        about = await prisma.about.create({
          data: {
            title: title || 'About Us',
            titleAr: titleAr || 'من نحن',
            content: content || '',
            contentAr: contentAr || '',
            isActive: isActive !== undefined ? isActive : true,
          },
        });
      } else {
        about = await prisma.about.update({
          where: { id: about.id },
          data: {
            ...(title !== undefined && { title }),
            ...(titleAr !== undefined && { titleAr }),
            ...(content !== undefined && { content }),
            ...(contentAr !== undefined && { contentAr }),
            ...(isActive !== undefined && { isActive }),
          },
        });
      }

      res.json({
        success: true,
        about,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Privacy content
   */
  static async getPrivacy(req, res, next) {
    try {
      let privacy = await prisma.privacy.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (!privacy) {
        privacy = await prisma.privacy.create({
          data: {
            title: 'Privacy Policy',
            titleAr: 'سياسة الخصوصية',
            content: 'Our privacy policy...',
            contentAr: 'سياسة الخصوصية الخاصة بنا...',
          },
        });
      }

      res.json({
        success: true,
        privacy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Privacy content
   */
  static async updatePrivacy(req, res, next) {
    try {
      const { title, titleAr, content, contentAr, version, isActive } = req.body;

      let privacy = await prisma.privacy.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (!privacy) {
        privacy = await prisma.privacy.create({
          data: {
            title: title || 'Privacy Policy',
            titleAr: titleAr || 'سياسة الخصوصية',
            content: content || '',
            contentAr: contentAr || '',
            version: version || '1.0',
            isActive: isActive !== undefined ? isActive : true,
          },
        });
      } else {
        privacy = await prisma.privacy.update({
          where: { id: privacy.id },
          data: {
            ...(title !== undefined && { title }),
            ...(titleAr !== undefined && { titleAr }),
            ...(content !== undefined && { content }),
            ...(contentAr !== undefined && { contentAr }),
            ...(version !== undefined && { version }),
            ...(isActive !== undefined && { isActive }),
          },
        });
      }

      res.json({
        success: true,
        privacy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Terms content
   */
  static async getTerms(req, res, next) {
    try {
      let terms = await prisma.terms.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (!terms) {
        terms = await prisma.terms.create({
          data: {
            title: 'Terms & Conditions',
            titleAr: 'الشروط والأحكام',
            content: 'Our terms and conditions...',
            contentAr: 'الشروط والأحكام الخاصة بنا...',
          },
        });
      }

      res.json({
        success: true,
        terms,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Terms content
   */
  static async updateTerms(req, res, next) {
    try {
      const { title, titleAr, content, contentAr, version, isActive } = req.body;

      let terms = await prisma.terms.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (!terms) {
        terms = await prisma.terms.create({
          data: {
            title: title || 'Terms & Conditions',
            titleAr: titleAr || 'الشروط والأحكام',
            content: content || '',
            contentAr: contentAr || '',
            version: version || '1.0',
            isActive: isActive !== undefined ? isActive : true,
          },
        });
      } else {
        terms = await prisma.terms.update({
          where: { id: terms.id },
          data: {
            ...(title !== undefined && { title }),
            ...(titleAr !== undefined && { titleAr }),
            ...(content !== undefined && { content }),
            ...(contentAr !== undefined && { contentAr }),
            ...(version !== undefined && { version }),
            ...(isActive !== undefined && { isActive }),
          },
        });
      }

      res.json({
        success: true,
        terms,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ContentController;


