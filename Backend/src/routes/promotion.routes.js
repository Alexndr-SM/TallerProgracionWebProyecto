const express = require('express');
const controller = require('../controllers/promotionController');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.get('/', controller.listActivePromotions);
router.get('/slug/:slug', controller.getPromotion);
router.get('/:id', controller.getPromotion);
router.post('/', requireAuth, requireRole('admin', 'editor'), controller.createPromotion);
router.put('/:id', requireAuth, requireRole('admin', 'editor'), controller.updatePromotion);
router.delete('/:id', requireAuth, requireRole('admin', 'editor'), controller.deletePromotion);

module.exports = router;
