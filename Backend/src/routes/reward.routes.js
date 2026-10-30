const express = require('express');
const { listRewards, redeemReward } = require('../controllers/rewardController');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);
router.get('/', listRewards);
router.post('/:id/canjear', requireRole('cliente'), redeemReward);

module.exports = router;
