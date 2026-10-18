const express = require('express');
const { createReservation } = require('../controllers/reservationController');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', requireAuth, createReservation);

module.exports = router;