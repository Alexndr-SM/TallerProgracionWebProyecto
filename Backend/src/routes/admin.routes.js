const express = require('express');
const controller = require('../controllers/adminController');
const cmsPromotions = require('../controllers/promotionController');
const { requireAuth, requireRole, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', requireRole('admin', 'registrador', 'soporte'), controller.getSummary);
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
router.post('/promociones', requireAdmin, controller.createPromotion);
router.patch('/promociones/:id', requireAdmin, controller.updatePromotion);

module.exports = router;
