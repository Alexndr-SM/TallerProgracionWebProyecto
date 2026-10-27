const express = require('express');
const { listComments, createComment } = require('../controllers/commentController');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.get('/', listComments);
router.post('/', requireAuth, createComment);

module.exports = router;
