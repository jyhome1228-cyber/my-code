export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.IMAGES) {
    return json({ error: 'R2 binding IMAGES is not configured.' }, 503);
  }

  const contentType = request.headers.get('content-type') || 'application/octet-stream';
  if (!contentType.startsWith('image/')) {
    return json({ error: 'Only image uploads are allowed.' }, 415);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  const maxBytes = 20 * 1024 * 1024;
  if (contentLength && contentLength > maxBytes) {
    return json({ error: 'Image is too large. Maximum size is 20 MB.' }, 413);
  }

  const body = await request.arrayBuffer();
  if (!body.byteLength || body.byteLength > maxBytes) {
    return json({ error: 'Invalid image size.' }, 413);
  }

  const requestedName = decodeURIComponent(request.headers.get('x-file-name') || 'image.webp');
  const imageId = request.headers.get('x-image-id') || crypto.randomUUID();
  const safeName = sanitizeFileName(requestedName);
  const now = new Date();
  const key = [
    'images',
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    imageId,
    safeName
  ].join('/');

  await env.IMAGES.put(key, body, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable'
    },
    customMetadata: {
      imageId,
      originalName: safeName
    }
  });

  const cdnBase = String(env.CDN_BASE_URL || '').replace(/\/$/, '');
  if (!cdnBase) {
    return json({ key, url: null, warning: 'CDN_BASE_URL is not configured.' }, 201);
  }

  return json({
    key,
    url: `${cdnBase}/${key}`
  }, 201);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

function sanitizeFileName(value) {
  const cleaned = value
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9가-힣._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'image.webp';
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders()
    }
  });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-file-name, x-image-id'
  };
}
