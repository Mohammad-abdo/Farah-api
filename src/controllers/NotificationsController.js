const getPrisma = require('../utils/prisma');
const { NotFoundError, ValidationError } = require('../utils/errors');

const prisma = getPrisma();

class NotificationsController {
  /**
   * Get all notifications for a user
   */
  static async getAll(req, res, next) {
    try {
      const userId = req.user.userId;
      const { isRead, category, limit = 50, offset = 0 } = req.query;

      const where = {
        userId,
        ...(isRead !== undefined && { isRead: isRead === 'true' }),
        ...(category && { category }),
      };

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset),
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: { userId, isRead: false },
        }),
      ]);

      res.json({
        success: true,
        notifications,
        total,
        unreadCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get notification by ID
   */
  static async getById(req, res, next) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const notification = await prisma.notification.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!notification) {
        throw new NotFoundError('Notification');
      }

      res.json({
        success: true,
        notification,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(req, res, next) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const notification = await prisma.notification.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!notification) {
        throw new NotFoundError('Notification');
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      res.json({
        success: true,
        notification: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req, res, next) {
    try {
      const userId = req.user.userId;

      await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete notification
   */
  static async delete(req, res, next) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const notification = await prisma.notification.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!notification) {
        throw new NotFoundError('Notification');
      }

      await prisma.notification.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete all notifications
   */
  static async deleteAll(req, res, next) {
    try {
      const userId = req.user.userId;
      const { isRead } = req.query;

      const where = {
        userId,
        ...(isRead !== undefined && { isRead: isRead === 'true' }),
      };

      await prisma.notification.deleteMany({
        where,
      });

      res.json({
        success: true,
        message: 'Notifications deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(req, res, next) {
    try {
      const userId = req.user.userId;

      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });

      res.json({
        success: true,
        count,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create notification (Admin only or system)
   */
  static async create(req, res, next) {
    try {
      const { userId, title, message, type, category, link, metadata } = req.body;

      if (!userId || !title || !message || !category) {
        throw new ValidationError('userId, title, message, and category are required');
      }

      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type: type || 'INFO',
          category,
          link,
          metadata,
        },
      });

      res.status(201).json({
        success: true,
        notification,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = NotificationsController;


