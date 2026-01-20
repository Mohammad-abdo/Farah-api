const express = require('express');
const ReportsController = require('../controllers/ReportsController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// All report routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Get all reports
router.get('/', ReportsController.getAll);

// Generate report
router.post('/generate', ReportsController.generate);

// Get single report by ID
router.get('/:id', ReportsController.getById);

// Download report
router.get('/:id/download', ReportsController.download);

// Delete report
router.delete('/:id', ReportsController.delete);

module.exports = router;
