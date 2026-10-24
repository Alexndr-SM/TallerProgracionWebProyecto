const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { uploadImages } = require('../middleware/cmsUpload.middleware');
const controller = require('../controllers/uploadController');
router.post('/', requireAuth, requireRole('admin', 'editor'), uploadImages, controller.uploadImages);
module.exports = router;
