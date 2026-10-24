const { endpoint, CmsError } = require('../utils/cms');
const { listMedia } = require('../services/mediaLibrary');

const getMedia = endpoint(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const cursor = req.query.cursor;
  if (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 1024 || !cursor.trim() || /[\x00-\x1f]/.test(cursor))) {
    throw new CmsError('El cursor de la biblioteca no es válido.');
  }
  return res.json({ ok: true, ...await listMedia(cursor) });
});
module.exports = { getMedia };
