const express = require('express');
const multer = require('multer');
const {
  getPerfil,
  getMisReservas,
  getMisPuntos,
  cancelarReserva,
  confirmarPagoReserva,
  reembolsarReserva,
  actualizarPerfil,
  actualizarFotoPerfil,
  cambiarPassword,
} = require('../controllers/perfilController');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
const uploadProfilePhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(new Error('La foto debe estar en formato JPG, PNG o WebP.'));
    }
    return callback(null, true);
  },
});

function receiveProfilePhoto(req, res, next) {
  uploadProfilePhoto.single('fotoPerfil')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ ok: false, message: 'La foto no puede superar los 5 MB.' });
    }
    if (err.message === 'La foto debe estar en formato JPG, PNG o WebP.') {
      return res.status(400).json({ ok: false, message: err.message });
    }
    console.error('receiveProfilePhoto:', err.message);
    return res.status(400).json({ ok: false, message: 'No se pudo procesar la foto enviada.' });
  });
}

// Todas las rutas requieren sesión activa
router.use(requireAuth);

router.get('/', getPerfil);
router.patch('/', actualizarPerfil);
router.post('/foto', receiveProfilePhoto, actualizarFotoPerfil);
router.patch('/password', cambiarPassword);
router.get('/reservas', getMisReservas);
router.get('/puntos', getMisPuntos);
router.patch('/reservas/:id/confirmar-pago', confirmarPagoReserva);
router.patch('/reservas/:id/cancelar', cancelarReserva);
router.patch('/reservas/:id/reembolsar', reembolsarReserva);

module.exports = router;
