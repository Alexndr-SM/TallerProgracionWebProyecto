const { cloudinary, configureCloudinary } = require('../config/cloudinary');
const { invalidateMediaCache } = require('../services/mediaLibrary');

function validSignature(file) {
  const buffer = file.buffer;
  if (file.mimetype === 'image/jpeg') return buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (file.mimetype === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return file.mimetype === 'image/webp' && buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
}
function uploadBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: 'icaturismo/cms', resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], timeout: 60000,
    }, (error, result) => error ? reject(error) : resolve(result));
    stream.on('error', reject);
    stream.end(buffer);
  });
}
async function uploadImages(req, res) {
  if (!req.files?.length) return res.status(400).json({ ok: false, message: 'Adjunta al menos una imagen en el campo imagenes.' });
  if (!req.files.every(validSignature)) return res.status(400).json({ ok: false, message: 'El contenido de algún archivo no coincide con su tipo de imagen.' });
  try { configureCloudinary(); }
  catch (error) {
    console.error('CMS Cloudinary:', error.message);
    return res.status(503).json({ ok: false, message: 'El servicio de imágenes no está configurado.' });
  }
  const uploaded = [];
  try {
    // Secuencial para limitar solicitudes simultáneas y preservar el orden.
    for (const file of req.files) uploaded.push(await uploadBuffer(file.buffer));
    invalidateMediaCache();
    return res.status(201).json({ ok: true, urls: uploaded.map((item) => item.secure_url) });
  } catch (error) {
    console.error('CMS upload:', error.message);
    const cleanup = await Promise.allSettled(uploaded.map((item) => cloudinary.uploader.destroy(item.public_id, { resource_type: 'image' })));
    cleanup.forEach((result) => {
      if (result.status === 'rejected') console.error('CMS cleanup:', result.reason.message);
    });
    return res.status(502).json({ ok: false, message: 'No se pudieron subir las imágenes. Inténtalo nuevamente.' });
  }
}
module.exports = { uploadImages };
