const getPrisma = require('../utils/prisma');
const { ValidationError, NotFoundError } = require('../utils/errors');

const prisma = getPrisma();

class CreditCardController {
  /**
   * Get all credit cards for the authenticated user
   * GET /api/mobile/cards
   */
  static async getCards(req, res, next) {
    try {
      const userId = req.user.id;

      const cards = await prisma.creditCard.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
        select: {
          id: true,
          cardNumber: true,
          cardholderName: true,
          expiryDate: true,
          isDefault: true,
          createdAt: true,
        },
      });

      // Mask card numbers (show only last 4 digits)
      const maskedCards = cards.map(card => ({
        ...card,
        cardNumber: `**** **** **** ${card.cardNumber.slice(-4)}`,
      }));

      res.json({
        success: true,
        cards: maskedCards,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a new credit card
   * POST /api/mobile/cards
   */
  static async addCard(req, res, next) {
    try {
      const userId = req.user.id;
      const { cardNumber, cardholderName, expiryDate, cvv, isDefault } = req.body;

      // Validation
      if (!cardNumber || !cardholderName || !expiryDate) {
        throw new ValidationError('Card number, cardholder name, and expiry date are required');
      }

      // Validate card number (should be 16 digits)
      const cleanCardNumber = cardNumber.replace(/\s/g, '');
      if (cleanCardNumber.length !== 16 || !/^\d+$/.test(cleanCardNumber)) {
        throw new ValidationError('Invalid card number');
      }

      // Validate expiry date format (MM/YY)
      if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
        throw new ValidationError('Invalid expiry date format. Use MM/YY');
      }

      // Validate CVV (3-4 digits)
      if (cvv && !/^\d{3,4}$/.test(cvv)) {
        throw new ValidationError('Invalid CVV');
      }

      // If this is set as default, unset other default cards
      if (isDefault) {
        await prisma.creditCard.updateMany({
          where: {
            userId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      // Store only last 4 digits (in production, encrypt the full number)
      const last4Digits = cleanCardNumber.slice(-4);

      const card = await prisma.creditCard.create({
        data: {
          userId,
          cardNumber: last4Digits, // In production, store encrypted full number
          cardholderName: cardholderName.toUpperCase(),
          expiryDate,
          cvv: cvv ? cvv : null, // In production, encrypt CVV
          isDefault: isDefault || false,
        },
        select: {
          id: true,
          cardNumber: true,
          cardholderName: true,
          expiryDate: true,
          isDefault: true,
          createdAt: true,
        },
      });

      // Mask card number in response
      const maskedCard = {
        ...card,
        cardNumber: `**** **** **** ${card.cardNumber}`,
      };

      res.status(201).json({
        success: true,
        message: 'Card added successfully',
        card: maskedCard,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a credit card
   * PATCH /api/mobile/cards/:id
   */
  static async updateCard(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { cardholderName, expiryDate, isDefault } = req.body;

      // Check if card exists and belongs to user
      const existingCard = await prisma.creditCard.findFirst({
        where: {
          id,
          userId,
          isActive: true,
        },
      });

      if (!existingCard) {
        throw new NotFoundError('Credit card');
      }

      // If setting as default, unset other default cards
      if (isDefault === true) {
        await prisma.creditCard.updateMany({
          where: {
            userId,
            id: { not: id },
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const updateData = {};
      if (cardholderName) updateData.cardholderName = cardholderName.toUpperCase();
      if (expiryDate) {
        if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
          throw new ValidationError('Invalid expiry date format. Use MM/YY');
        }
        updateData.expiryDate = expiryDate;
      }
      if (isDefault !== undefined) updateData.isDefault = isDefault;

      const card = await prisma.creditCard.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          cardNumber: true,
          cardholderName: true,
          expiryDate: true,
          isDefault: true,
          createdAt: true,
        },
      });

      // Mask card number in response
      const maskedCard = {
        ...card,
        cardNumber: `**** **** **** ${card.cardNumber}`,
      };

      res.json({
        success: true,
        message: 'Card updated successfully',
        card: maskedCard,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a credit card (soft delete)
   * DELETE /api/mobile/cards/:id
   */
  static async deleteCard(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if card exists and belongs to user
      const existingCard = await prisma.creditCard.findFirst({
        where: {
          id,
          userId,
          isActive: true,
        },
      });

      if (!existingCard) {
        throw new NotFoundError('Credit card');
      }

      // Soft delete
      await prisma.creditCard.update({
        where: { id },
        data: {
          isActive: false,
        },
      });

      res.json({
        success: true,
        message: 'Card deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CreditCardController;

