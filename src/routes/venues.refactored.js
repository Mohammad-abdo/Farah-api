const express = require('express');
const VenuesController = require('../controllers/VenuesController');

const router = express.Router();

/**
 * @swagger
 * /api/venues:
 *   get:
 *     summary: Get all venues
 *     tags: [Venues]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search venues by name or location
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of venues
 */
router.get('/', VenuesController.getAll);

/**
 * @swagger
 * /api/venues/top:
 *   get:
 *     summary: Get top rated venues
 *     tags: [Venues]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: List of top venues
 */
router.get('/top', VenuesController.getTop);

/**
 * @swagger
 * /api/venues/popular:
 *   get:
 *     summary: Get popular venues
 *     tags: [Venues]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: List of popular venues
 */
router.get('/popular', VenuesController.getPopular);

/**
 * @swagger
 * /api/venues/{id}:
 *   get:
 *     summary: Get venue by ID
 *     tags: [Venues]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Venue details
 *       404:
 *         description: Venue not found
 */
router.get('/:id', VenuesController.getById);

module.exports = router;



