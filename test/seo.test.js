import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { normalizeSiteUrl, robotsTxt, sitemapXml } from '../src/seo.js';
import { renderPage } from '../src/render.js';
import { openCache } from '../src/cache.js';
import { weekWindow, nextSeason } from '../src/time.js';

const siteUrl = 'https://anime.example';
const now = Date.parse('2026-10-28T03:00:00Z');
const media = { id: 1, title: { romaji: 'Anime </script><script>bad()</script>' }, format: 'TV', externalLinks: [], siteUrl: 'https://anilist.co/anime/1' };
const snapshot = { key: 'WINTER-2027', updatedAt: now, data: [media] };
const schema = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);

test('public origin is explicit, normalized and rejects non-origin values', () => {
  assert.equal(normalizeSiteUrl(''), null);
  assert.equal(normalizeSiteUrl(' https://ANIME.example/ '), siteUrl);
  for (const value of ['javascript:alert(1)', 'https://user:pass@anime.example', `${siteUrl}/path`, `${siteUrl}?q=1`, `${siteUrl}#fragment`]) {
    assert.throws(() => normalizeSiteUrl(value));
  }
  assert.equal(robotsTxt(null), 'User-agent: *\nDisallow: /\n');
  assert.match(robotsTxt(siteUrl), /Sitemap: https:\/\/anime.example\/sitemap.xml/);
  assert.deepEqual([...sitemapXml(siteUrl).matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]), [`${siteUrl}/`, `${siteUrl}/upcoming`]);
});

test('SSR supplies distinct Thai metadata, canonical, social tags and safe matching structured data', () => {
  const upcoming = renderPage({ snapshot, upcoming: true, now, siteUrl });
  const calendar = renderPage({ snapshot: { key: '2026-10-28', updatedAt: now, data: [] }, now, siteUrl });
  assert.match(upcoming, /<title>อนิเมะซีซั่นหน้า WINTER 2027/);
  assert.match(calendar, /<title>ตารางฉายอนิเมะวันนี้และประจำสัปดาห์ เวลาไทย/);
  assert.match(calendar, /<h1>ตารางฉายอนิเมะวันนี้<\/h1>/);
  assert.match(upcoming, /rel="canonical" href="https:\/\/anime.example\/upcoming"/);
  assert.match(calendar, /rel="canonical" href="https:\/\/anime.example\/"/);
  assert.match(upcoming, /name="robots" content="index, follow, max-image-preview:large"/);
  assert.match(upcoming, /property="og:locale" content="th_TH"/);
  assert.match(upcoming, /name="twitter:card" content="summary"/);
  assert.doesNotMatch(upcoming, /<script>bad/);
  const graph = schema(upcoming)['@graph'];
  assert.equal(graph[0]['@type'], 'WebSite');
  assert.equal(graph[1].mainEntity.numberOfItems, 1);
  assert.equal(graph[1].mainEntity.itemListElement[0].item.name, media.title.romaji);
  assert.equal(graph[1].mainEntity.itemListElement[0].item.url, media.siteUrl);
});

test('search/filter variants and previews are not indexed, and unavailable data has no schema', () => {
  for (const params of [{ q: 'absent' }, { format: 'MOVIE' }, { future: true }]) {
    const html = renderPage({ snapshot, upcoming: true, now, siteUrl, params });
    assert.match(html, /name="robots" content="noindex, follow"/);
    assert.match(html, /rel="canonical" href="https:\/\/anime.example\/upcoming"/);
    if (params.q || params.format) assert.equal(schema(html)['@graph'][1].mainEntity.numberOfItems, 0);
  }
  const preview = renderPage({ snapshot, upcoming: true, now });
  assert.match(preview, /name="robots" content="noindex, follow"/);
  assert.doesNotMatch(preview, /rel="canonical"|application\/ld\+json/);
  const unavailable = renderPage({ snapshot: { ...snapshot, key: 'FALL-2026' }, upcoming: true, now, siteUrl });
  assert.doesNotMatch(unavailable, /application\/ld\+json/);
});

async function withServer(configured, check) {
  const dir = mkdtempSync(join(tmpdir(), 'anime-seo-'));
  const databasePath = join(dir, 'test.sqlite');
  const cache = openCache(databasePath);
  const time = Date.now();
  const season = nextSeason(time);
  cache.set('calendar', weekWindow(time).key, [], time);
  cache.set('upcoming', `${season.season}-${season.year}`, [media], time);
  cache.close();
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, PORT: '0', HOST: '127.0.0.1', SITE_URL: configured ? siteUrl : '', DATABASE_PATH: databasePath },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  try {
    const origin = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('SEO test server startup timed out')), 5000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`SEO test server exited: ${code}\n${stderr}`)); });
      child.stdout.on('data', chunk => {
        const match = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
    });
    await check(origin, databasePath);
  } finally {
    if (child.exitCode === null) {
      const stopped = once(child, 'exit');
      child.kill('SIGTERM');
      await stopped;
    }
    rmSync(dir, { recursive: true, force: true });
  }
}

test('HTTP crawler endpoints, redirects, HEAD and missing season behavior', async () => {
  await withServer(true, async (origin, databasePath) => {
    const page = await fetch(`${origin}/`, { headers: { Host: 'untrusted.example' } });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /rel="canonical" href="https:\/\/anime.example\/"/);
    const alias = await fetch(`${origin}/calendar?q=test`, { redirect: 'manual' });
    assert.equal(alias.status, 301);
    assert.equal(alias.headers.get('location'), '/?q=test');
    const robots = await fetch(`${origin}/robots.txt`);
    assert.equal(robots.status, 200);
    assert.match(await robots.text(), /Allow: \/\n/);
    const sitemap = await fetch(`${origin}/sitemap.xml`);
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.headers.get('content-type'), /application\/xml/);
    assert.equal(await sitemap.text(), sitemapXml(siteUrl));
    const head = await fetch(`${origin}/sitemap.xml`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    for (const path of ['/api/calendar', '/api/upcoming', '/health']) {
      const result = await fetch(`${origin}${path}`);
      assert.equal(result.headers.get('x-robots-tag'), 'noindex');
    }
    assert.equal((await fetch(`${origin}/missing`)).status, 404);
    const cache = openCache(databasePath);
    cache.set('upcoming', 'OLD-SEASON', [media], Date.now());
    cache.close();
    const missing = await fetch(`${origin}/upcoming`);
    assert.equal(missing.status, 503);
    assert.equal(missing.headers.get('retry-after'), '10');
    assert.match(await missing.text(), /data-missing="true"/);
  });
  await withServer(false, async origin => {
    assert.match(await (await fetch(`${origin}/robots.txt`)).text(), /Disallow: \//);
    assert.equal((await fetch(`${origin}/sitemap.xml`)).status, 503);
    assert.match(await (await fetch(`${origin}/`)).text(), /name="robots" content="noindex, follow"/);
  });
});
