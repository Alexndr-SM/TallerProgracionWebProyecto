const { randomUUID } = require('crypto');
const { pool } = require('../config/database');
const { cloudinary, configureCloudinary } = require('../config/cloudinary');

function uploadProfilePhoto(buffer, userId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: 'icaturismo/perfiles',
      public_id: `${userId}-${randomUUID()}`,
      resource_type: 'image',
    }, (error, result) => {
      if (error) return reject(error);
      if (!result) return reject(new Error('Cloudinary no devolvió los datos de la imagen.'));
      return resolve(result);
    });

    stream.end(buffer);
  });
}

async function listComments(req, res) {
  const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ ok: false, message: 'El límite debe ser un número entre 1 y 100.' });
  }

  try {
    const result = await pool.query(
      `SELECT c.id, c.contenido, c.calificacion, c.created_at,
              u.nombre, u.foto_perfil_url
       FROM comentarios c
       JOIN usuarios u ON u.id = c.usuario_id
       ORDER BY c.created_at DESC, c.id DESC
       LIMIT $1`,
      [limit]
    );
    return res.json({ ok: true, comments: result.rows });
  } catch (err) {
    console.error('listComments:', err.message);
    return res.status(500).json({ ok: false, message: 'No se pudieron cargar los comentarios.' });
  }
}

async function createComment(req, res) {
  const contenido = typeof req.body.contenido === 'string' ? req.body.contenido.trim() : '';
  const calificacion = Number(req.body.calificacion);

  if (!contenido || contenido.length > 1000) {
    return res.status(400).json({ ok: false, message: 'El comentario debe tener entre 1 y 1000 caracteres.' });
  }
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
    return res.status(400).json({ ok: false, message: 'Selecciona una calificación entre 1 y 5 estrellas.' });
  }

  let uploadedImage;
  let oldProfilePublicId;
  let client;
  let transactionStarted = false;

  try {
    if (req.file) {
      configureCloudinary();
      uploadedImage = await uploadProfilePhoto(req.file.buffer, req.user.id);
    }

    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    let user;
    if (uploadedImage) {
      const previousProfile = await client.query(
        'SELECT foto_perfil_public_id FROM usuarios WHERE id = $1',
        [req.user.id]
      );
      oldProfilePublicId = previousProfile.rows[0]?.foto_perfil_public_id;
      const result = await client.query(
        `UPDATE usuarios
         SET foto_perfil_url = $1, foto_perfil_public_id = $2
         WHERE id = $3
         RETURNING nombre, foto_perfil_url, foto_perfil_public_id`,
        [uploadedImage.secure_url, uploadedImage.public_id, req.user.id]
      );
      user = result.rows[0];
    } else {
      const result = await client.query(
        `SELECT nombre, foto_perfil_url, foto_perfil_public_id
         FROM usuarios WHERE id = $1`,
        [req.user.id]
      );
      user = result.rows[0];
    }

    if (!user) {
      throw new Error('No se encontró el usuario autenticado.');
    }

    const inserted = await client.query(
      `INSERT INTO comentarios (usuario_id, contenido, calificacion)
       VALUES ($1, $2, $3)
       RETURNING id, contenido, calificacion, created_at`,
      [req.user.id, contenido, calificacion]
    );
    await client.query('COMMIT');
    transactionStarted = false;

    if (uploadedImage && oldProfilePublicId && oldProfilePublicId !== uploadedImage.public_id) {
      try {
        await cloudinary.uploader.destroy(oldProfilePublicId, { resource_type: 'image' });
      } catch (cleanupError) {
        console.error('No se pudo eliminar la foto de perfil anterior:', cleanupError.message);
      }
    }

    return res.status(201).json({
      ok: true,
      message: 'Comentario publicado correctamente.',
      comment: { ...inserted.rows[0], nombre: user.nombre, foto_perfil_url: user.foto_perfil_url },
    });
  } catch (err) {
    if (transactionStarted && client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('createComment rollback:', rollbackError.message);
      }
    }

    if (uploadedImage) {
      try {
        await cloudinary.uploader.destroy(uploadedImage.public_id, { resource_type: 'image' });
      } catch (cleanupError) {
        console.error('No se pudo limpiar la imagen de Cloudinary:', cleanupError.message);
      }
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('createComment:', errorMessage);
    const cloudinaryNotConfigured = errorMessage.startsWith('Configura CLOUDINARY_')
      || errorMessage.startsWith('CLOUDINARY_URL');
    const status = cloudinaryNotConfigured ? 503 : 500;
    const message = cloudinaryNotConfigured
      ? 'La subida de fotos no está configurada en el servidor.'
      : 'No se pudo publicar el comentario.';
    return res.status(status).json({ ok: false, message });
  } finally {
    if (client) client.release();
  }
}

module.exports = { listComments, createComment };
