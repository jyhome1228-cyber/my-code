const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage, getDownloadURL } = require('firebase-admin/storage');
const crypto = require('crypto');

initializeApp();

function safeName(value = 'image') {
  const clean = String(value)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return clean || 'image';
}

exports.uploadImage = onRequest(
  {
    region: 'us-central1',
    cors: true,
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      return;
    }

    const contentType = String(req.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/')) {
      res.status(415).json({ error: 'IMAGE_ONLY' });
      return;
    }

    const body = req.rawBody;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ error: 'EMPTY_FILE' });
      return;
    }
    if (body.length > 10 * 1024 * 1024) {
      res.status(413).json({ error: 'FILE_TOO_LARGE', maxBytes: 10 * 1024 * 1024 });
      return;
    }

    const originalName = safeName(req.query.name || 'image');
    const id = crypto.randomUUID();
    const date = new Date().toISOString().slice(0, 10);
    const objectPath = `public/${date}/${id}-${originalName}`;

    try {
      const bucket = getStorage().bucket();
      const file = bucket.file(objectPath);

      await file.save(body, {
        resumable: false,
        validation: false,
        metadata: {
          contentType,
          cacheControl: 'public,max-age=31536000,immutable',
          metadata: {
            originalName,
            uploadedBy: 'mycode-web'
          }
        }
      });

      const url = await getDownloadURL(file);
      res.set('Cache-Control', 'no-store');
      res.status(200).json({
        ok: true,
        url,
        path: objectPath,
        name: originalName,
        size: body.length,
        contentType
      });
    } catch (error) {
      console.error('uploadImage failed', error);
      res.status(500).json({
        error: 'UPLOAD_FAILED',
        message: error?.message || 'Unknown upload error'
      });
    }
  }
);

exports.image = onRequest({ region: 'us-central1' }, async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const parts = String(req.path || '').split('/').filter(Boolean);
  const shortCode = (parts[parts.length - 1] || '').replace(/\.[a-z0-9]+$/i, '');

  if (!/^[A-Za-z0-9]{5,12}$/.test(shortCode)) {
    res.status(404).send('Image not found');
    return;
  }

  try {
    const snapshot = await getFirestore().doc(`shortLinks/${shortCode}`).get();
    if (!snapshot.exists) {
      res.status(404).send('Image not found');
      return;
    }

    const targetUrl = snapshot.data()?.targetUrl;
    if (!targetUrl || !/^https:\/\//i.test(targetUrl)) {
      res.status(404).send('Image not found');
      return;
    }

    res.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.redirect(302, targetUrl);
  } catch (error) {
    console.error(error);
    res.status(500).send('Unable to resolve image');
  }
});
