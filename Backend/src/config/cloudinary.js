const cloudinary = require('cloudinary').v2;

let configured = false;

function configureCloudinary() {
  if (configured) return;

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_URL } = process.env;

  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
    return;
  }

  if (CLOUDINARY_URL) {
    let parsedUrl;
    try {
      parsedUrl = new URL(CLOUDINARY_URL);
    } catch {
      throw new Error('CLOUDINARY_URL no tiene un formato válido.');
    }

    if (parsedUrl.protocol !== 'cloudinary:'
      || !parsedUrl.hostname
      || !parsedUrl.username
      || !parsedUrl.password) {
      throw new Error('CLOUDINARY_URL debe contener cloud name, API key y API secret.');
    }

    cloudinary.config({
      cloud_name: parsedUrl.hostname,
      api_key: decodeURIComponent(parsedUrl.username),
      api_secret: decodeURIComponent(parsedUrl.password),
      secure: true,
    });
    configured = true;
    return;
  }

  throw new Error(
    'Configura CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET, o CLOUDINARY_URL.'
  );
}

module.exports = { cloudinary, configureCloudinary };
