const express = require('express');
const { register, login, me } = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.get('/admin/dashboard', requireAuth, requireAdmin, (req, res) => {
  res.json({
    ok: true,
    message: 'Bienvenido al panel de administrador.',
    user: req.user,
  });
});

module.exports = router;