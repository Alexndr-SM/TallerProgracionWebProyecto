const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10, fields: 0, parts: 10 },
  fileFilter(_req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      const error = new Error('Solo se permiten imágenes JPEG, PNG y WebP.');
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

const multipleImages = upload.array('imagenes', 10);
function uploadImages(req, res, next) {
  multipleImages(req, res, (error) => {
    if (!error) return next();
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = error instanceof multer.MulterError
      ? 'Usa el campo imagenes, con entre 1 y 10 archivos de máximo 5 MB cada uno.'
      : error.message;
    return res.status(status).json({ ok: false, message });
  });
}
module.exports = { uploadImages };
