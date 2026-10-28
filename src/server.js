import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { openCache } from './cache.js';
import { createSync } from './anilist.js';
import { renderPage } from './render.js';
import { weekWindow, nextSeason } from './time.js';
import { PLATFORM_BRANDS } from './platform-brands.js';
import { isSnapshotFresh } from './freshness.js';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cache = openCache(resolve(process.env.DATABASE_PATH || resolve(ROOT, 'data/anime.sqlite')));
const sync = createSync(cache);
const assets = new Map([
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/airing.js', ['airing.js', 'text/javascript; charset=utf-8']],
  ['/sakura-background.webp', ['sakura-background.webp', 'image/webp']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']]
]);
for (const brand of PLATFORM_BRANDS) assets.set(`/platform-icons/${brand.id}.png`, [`platform-icons/${brand.id}.png`, 'image/png']);
const security = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://s4.anilist.co; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY'
};
function send(req, res, status, body, type = 'text/html; charset=utf-8', headers = {}) {
  let bytes = Buffer.from(body);
  const compressed = /\bgzip\b/.test(req.headers['accept-encoding'] || '') && bytes.length > 1024;
  if (compressed) bytes = gzipSync(bytes);
  res.writeHead(status, { ...security, 'Content-Type':type,'Cache-Control':'no-cache', Vary:'Accept-Encoding', ...(compressed ? {'Content-Encoding':'gzip'} : {}), 'Content-Length':bytes.length,...headers });
  res.end(req.method === 'HEAD' ? undefined : bytes);
}
const server = createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!['GET', 'HEAD'].includes(req.method)) return send(req,res,405,'Method not allowed','text/plain; charset=utf-8',{Allow:'GET, HEAD'});
    if (assets.has(url.pathname)) {
      const [file,type] = assets.get(url.pathname);
      const assetCache = url.pathname === '/sakura-background.webp' ? { 'Cache-Control':'public, max-age=86400' } : {};
      return send(req,res,200,readFileSync(resolve(ROOT,'public',file)),type,assetCache);
    }
    if (url.pathname === '/health') return send(req,res,200,JSON.stringify({ok:true}), 'application/json; charset=utf-8');
    if (!['/', '/calendar', '/upcoming', '/api/calendar', '/api/upcoming'].includes(url.pathname)) return send(req,res,404,'<!doctype html><html lang="th"><meta charset="utf-8"><title>ไม่พบหน้า</title><body><h1>ไม่พบหน้านี้</h1><a href="/">กลับไปตารางฉาย</a></body></html>');
    const upcoming = url.pathname.endsWith('upcoming');
    const kind = upcoming ? 'upcoming' : 'calendar';
    const snapshot = cache.get(kind);
    const now = Date.now();
    const { start, end, key:calendarKey } = weekWindow(now);
    const season = nextSeason(now);
    const key = upcoming ? `${season.season}-${season.year}` : calendarKey;
    if (url.pathname.startsWith('/api/')) {
      const valid = snapshot && (!upcoming || snapshot.key === key);
      return send(req,res,valid ? 200 : 503,JSON.stringify({ source:'AniList', timezone:'Asia/Bangkok', key, season:upcoming ? season : undefined, updatedAt:valid ? snapshot.updatedAt : null, stale:!isSnapshotFresh(valid ? snapshot : null, kind, now), syncing:sync.syncing, error:sync.error(kind) ? 'ข้อมูลจาก AniList ไม่พร้อมใช้งานชั่วคราว' : null, data:valid ? snapshot.data.filter(row=>upcoming || (row.airingAt >= start && row.airingAt < end)) : [] }), 'application/json; charset=utf-8', valid ? {} : {'Retry-After':'10'});
    }
    const params = {q:(url.searchParams.get('q') || '').slice(0,200), format:url.searchParams.get('format') || '', future:url.searchParams.get('future') === '1'};
    return send(req,res,200,renderPage({snapshot,upcoming,now,error:sync.error(kind),params}));
  } catch (error) {
    console.error('[request]', error.message);
    send(req,res,500,'เกิดข้อผิดพลาด กรุณาลองใหม่','text/plain; charset=utf-8');
  }
});
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
server.listen(port,host,() => { console.log(`Anime calendar: http://${host}:${port}`); void sync.refresh(); });
const timer = setInterval(() => { void sync.refresh(); },60000);
timer.unref();
function stop() { clearInterval(timer); server.close(() => { cache.close(); process.exit(0); }); }
process.once('SIGTERM',stop); process.once('SIGINT',stop);
