const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');
const { uploadImages } = require('../middleware/cmsUpload.middleware');
const controller = require('../controllers/uploadController');
router.post('/', requireAuth, requireAdmin, uploadImages, controller.uploadImages);
module.exports = router;
