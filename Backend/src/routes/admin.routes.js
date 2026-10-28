const express = require('express');
const controller = require('../controllers/adminController');
const cmsPromotions = require('../controllers/promotionController');
const { getMedia } = require('../controllers/mediaController');
const { getAnalytics } = require('../controllers/analyticsController');
const rewards = require('../controllers/rewardController');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', requireRole('admin', 'registrador', 'soporte'), controller.getSummary);
router.get('/analytics', requireRole('admin', 'registrador', 'soporte'), getAnalytics);
router.get('/reservas', requireRole('admin', 'registrador', 'soporte'), controller.listReservations);
router.post('/reservas', requireRole('admin', 'registrador'), controller.createLocalReservation);
router.patch('/reservas/:id', requireRole('admin', 'registrador'), controller.updateReservation);
router.get('/clientes', requireRole('admin', 'registrador', 'soporte'), controller.listCustomers);
router.patch('/clientes/:id', requireRole('admin'), controller.updateCustomerStatus);
router.patch('/clientes/:id/puntos', requireRole('admin'), controller.updateCustomerPoints);
router.get('/empleados', requireRole('admin'), controller.listEmployees);
router.post('/empleados', requireRole('admin'), controller.createEmployee);
router.patch('/empleados/:id', requireRole('admin'), controller.updateEmployee);
router.get('/promociones', requireRole('admin', 'editor'), cmsPromotions.listAdminPromotions);
router.get('/medios', requireRole('admin', 'editor'), getMedia);
router.post('/promociones', requireRole('admin', 'editor'), controller.createPromotion);
router.patch('/promociones/:id', requireRole('admin', 'editor'), controller.updatePromotion);
router.get('/recompensas', requireRole('admin', 'editor'), rewards.listAdminRewards);
router.post('/recompensas', requireRole('admin', 'editor'), rewards.createReward);
router.patch('/recompensas/:id', requireRole('admin', 'editor'), rewards.updateReward);
router.delete('/recompensas/:id', requireRole('admin', 'editor'), rewards.deleteReward);

module.exports = router;
