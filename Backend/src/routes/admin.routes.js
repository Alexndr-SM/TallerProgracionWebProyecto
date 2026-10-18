const express = require('express');
const controller = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', requireRole('admin', 'registrador', 'soporte'), controller.getSummary);
router.get('/reservas', requireRole('admin', 'registrador', 'soporte'), controller.listReservations);
router.post('/reservas', requireRole('admin', 'registrador'), controller.createLocalReservation);
router.patch('/reservas/:id', requireRole('admin', 'registrador'), controller.updateReservation);
router.get('/clientes', requireRole('admin', 'registrador', 'soporte'), controller.listCustomers);
router.patch('/clientes/:id', requireRole('admin'), controller.updateCustomerStatus);
router.get('/empleados', requireRole('admin'), controller.listEmployees);
router.post('/empleados', requireRole('admin'), controller.createEmployee);
router.patch('/empleados/:id', requireRole('admin'), controller.updateEmployee);
router.get('/promociones', requireRole('admin', 'editor'), controller.listPromotions);
router.post('/promociones', requireRole('admin', 'editor'), controller.createPromotion);
router.patch('/promociones/:id', requireRole('admin', 'editor'), controller.updatePromotion);

module.exports = router;
