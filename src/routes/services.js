const express = require('express');
const ServicesController = require('../controllers/ServicesController');

const router = express.Router();

router.get('/', ServicesController.getAll);
router.get('/category/:categoryId', ServicesController.getByCategory);
router.get('/:id', ServicesController.getById);

module.exports = router;


