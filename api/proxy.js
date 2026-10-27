export const config = { runtime: 'edge' };

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

function isPrivateHost(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === '::' || h === '::1' || h === '0.0.0.0' || h === '::ffff:127.0.0.1') return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(h)) return true;
  const m = h.match(/^172\.(\d+)\./); if (m && +m[1] >= 16 && +m[1] <= 31) return true;
  if (/^(fc|fd)[0-9a-f]{2}:/i.test(h) || /^fe[89ab][0-9a-f]:/i.test(h)) return true;
  // Reject non-public IPv4-mapped IPv6 and common alternate IPv4 encodings.
  if (/^::ffff:/i.test(h) || /^0x[0-9a-f]+$/i.test(h) || /^\d+$/.test(h)) return true;
  return false;
}

function parseTarget(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || isPrivateHost(u.hostname)) return null;
  return u;
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-allow-headers': 'Range, Accept, Content-Type, Origin, Referer',
    'access-control-expose-headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag, Last-Modified',
    'cross-origin-resource-policy': 'cross-origin',
    'cache-control': 'no-store, no-transform'
  };
}

async function fetchSafe(start, request) {
  let target = start;
  for (let hop = 0; hop <= 5; hop++) {
    const headers = new Headers();
    const range = request.headers.get('range');
    if (range) headers.set('range', range);
    headers.set('accept', request.headers.get('accept') || '*/*');
    headers.set('accept-encoding', 'identity');
    headers.set('user-agent', 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 AikuPlayer/6.0');
    headers.set('referer', target.origin + '/');
    headers.set('origin', target.origin);
    const response = await fetch(target.toString(), { method: request.method === 'HEAD' ? 'HEAD' : 'GET', headers, redirect: 'manual' });
    if (!REDIRECTS.has(response.status)) return { response, finalUrl: target.toString() };
    const location = response.headers.get('location');
    try { await response.body?.cancel(); } catch {}
    if (!location || hop === 5) throw new Error('Too many or invalid redirects');
    const next = parseTarget(new URL(location, target).toString());
    if (!next) throw new Error('Redirect target blocked');
    target = next;
  }
  throw new Error('Too many redirects');
}

export default async function handler(request) {
  const cors = corsHeaders();
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { ...cors, allow: 'GET, HEAD, OPTIONS' } });

  const reqUrl = new URL(request.url);
  const raw = reqUrl.searchParams.get('url');
  if (!raw) return new Response('Missing url', { status: 400, headers: cors });
  const target = parseTarget(raw);
  if (!target) return new Response('Invalid or blocked target URL', { status: 403, headers: cors });

  let result;
  try { result = await fetchSafe(target, request); }
  catch (e) { return new Response('Upstream request failed: ' + (e?.message || 'network error'), { status: 502, headers: cors }); }

  const upstream = result.response;
  const out = new Headers(cors);
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified', 'content-disposition']) {
    const value = upstream.headers.get(h); if (value) out.set(h, value);
  }
  if (!out.get('content-type')) {
    const path = new URL(result.finalUrl).pathname.toLowerCase();
    const ext = path.match(/\.([a-z0-9]+)$/i)?.[1] || '';
    const types = { mp4:'video/mp4', webm:'video/webm', mov:'video/quicktime', mkv:'video/x-matroska', m4v:'video/x-m4v', m3u8:'application/vnd.apple.mpegurl', ts:'video/mp2t', avi:'video/x-msvideo', flv:'video/x-flv', wmv:'video/x-ms-wmv', mpeg:'video/mpeg', mpg:'video/mpeg', ogv:'video/ogg', m2ts:'video/mp2t', mts:'video/mp2t', '3gp':'video/3gpp', mp3:'audio/mpeg', m4a:'audio/mp4', aac:'audio/aac', vtt:'text/vtt', srt:'application/x-subrip' };
    if (types[ext]) out.set('content-type', types[ext]);
  }

  const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
  const finalUrl = result.finalUrl;
  const isPlaylist = /\.m3u8$/i.test(new URL(finalUrl).pathname) || contentType.includes('mpegurl') || contentType.includes('vnd.apple.mpegurl');
  if (upstream.ok && request.method !== 'HEAD' && isPlaylist) {
    const body = await upstream.text();
    if (/^\s*#EXTM3U/m.test(body)) {
      const absolute = value => {
        const v = value.trim();
        if (!v || /^(data|skd):/i.test(v)) return value;
        try { return new URL(v, finalUrl).toString(); } catch { return value; }
      };
      const rewritten = body.split(/\r?\n/).map(line => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        if (trimmed.startsWith('#')) return line.replace(/URI=("|')([^"']+)\1/g, (_all, quote, uri) => `URI=${quote}${absolute(uri)}${quote}`);
        return absolute(trimmed);
      }).join('\n');
      out.set('content-type', 'application/vnd.apple.mpegurl; charset=utf-8');
      out.delete('content-length'); out.delete('content-range');
      return new Response(rewritten, { status: upstream.status, statusText: upstream.statusText, headers: out });
    }
  }
  return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
}
