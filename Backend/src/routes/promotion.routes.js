const express = require('express');
const controller = require('../controllers/promotionController');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();
router.get('/', controller.listActivePromotions);
router.get('/slug/:slug', controller.getPromotion);
router.get('/:id', controller.getPromotion);
router.post('/', requireAuth, requireAdmin, controller.createPromotion);
router.put('/:id', requireAuth, requireAdmin, controller.updatePromotion);
router.delete('/:id', requireAuth, requireAdmin, controller.deletePromotion);

module.exports = router;
