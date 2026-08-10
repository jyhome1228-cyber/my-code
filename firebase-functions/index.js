const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

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
