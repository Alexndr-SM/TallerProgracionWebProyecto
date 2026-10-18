const express = require('express');
const { listActivePromotions } = require('../controllers/promotionController');

const router = express.Router();
router.get('/', listActivePromotions);

module.exports = router;
