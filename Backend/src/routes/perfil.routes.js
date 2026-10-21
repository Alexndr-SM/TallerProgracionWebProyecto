const express = require('express');
const {
  getPerfil,
  getMisReservas,
  getMisPuntos,
  cancelarReserva,
  confirmarPagoReserva,
  reembolsarReserva,
  actualizarPerfil,
  cambiarPassword,
} = require('../controllers/perfilController');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Todas las rutas requieren sesión activa
router.use(requireAuth);

router.get('/', getPerfil);
router.patch('/', actualizarPerfil);
router.patch('/password', cambiarPassword);
router.get('/reservas', getMisReservas);
router.get('/puntos', getMisPuntos);
router.patch('/reservas/:id/confirmar-pago', confirmarPagoReserva);
router.patch('/reservas/:id/cancelar', cancelarReserva);
router.patch('/reservas/:id/reembolsar', reembolsarReserva);

module.exports = router;

