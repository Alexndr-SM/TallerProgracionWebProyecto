const { pool } = require('../config/database');

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
  const body = req.body || {};
  const contenido = typeof body.contenido === 'string' ? body.contenido.trim() : '';
  const calificacion = Number(body.calificacion);

  if (!contenido || contenido.length > 1000) {
    return res.status(400).json({ ok: false, message: 'El comentario debe tener entre 1 y 1000 caracteres.' });
  }
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
    return res.status(400).json({ ok: false, message: 'Selecciona una calificación entre 1 y 5 estrellas.' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const userResult = await client.query(
      'SELECT nombre, foto_perfil_url FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];

    if (!user) {
      await client.query('ROLLBACK');
      throw new Error('No se encontró el usuario autenticado.');
    }

    const inserted = await client.query(
      `INSERT INTO comentarios (usuario_id, contenido, calificacion)
       VALUES ($1, $2, $3)
       RETURNING id, contenido, calificacion, created_at`,
      [req.user.id, contenido, calificacion]
    );
    await client.query('COMMIT');

    return res.status(201).json({
      ok: true,
      message: 'Comentario publicado correctamente.',
      comment: { ...inserted.rows[0], nombre: user.nombre, foto_perfil_url: user.foto_perfil_url },
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('createComment rollback:', rollbackError.message);
      }
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('createComment:', errorMessage);
    return res.status(500).json({ ok: false, message: 'No se pudo publicar el comentario.' });
  } finally {
    if (client) client.release();
  }
}

module.exports = { listComments, createComment };
