import { nextSeason } from './time.js';

// Use configuration, never request Host/forwarded headers, for public URLs.
export function normalizeSiteUrl(value) {
  if (!value?.trim()) return null;
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SITE_URL must be an http(s) origin without credentials, path, query or fragment');
  }
  return url.origin;
}

export function pageSeo({ siteUrl, upcoming, now, params = {} }) {
  const season = nextSeason(now);
  const title = upcoming
    ? `อนิเมะซีซั่นหน้า ${season.season} ${season.year} และวันเริ่มฉาย | anime / calendar`
    : 'ตารางฉายอนิเมะวันนี้และประจำสัปดาห์ เวลาไทย | anime / calendar';
  const description = upcoming
    ? `รวมอนิเมะซีซั่นหน้า ${season.season} ${season.year} ที่ยังไม่เริ่มฉาย เช็กวันเริ่มฉาย ประเภท และช่องทางรับชมตามข้อมูล AniList พร้อมค้นหาชื่อเรื่อง`
    : 'เช็กตารางฉายอนิเมะวันนี้และล่วงหน้า 7 วันตามเวลาไทย ดูเวลาออกอากาศ เลขตอน และช่องทางรับชมจาก AniList ค้นหาชื่อเรื่องและกรองประเภทได้';
  const filtered = Boolean(params.q || params.format || params.future);
  return { title, description, canonical: siteUrl ? `${siteUrl}${upcoming ? '/upcoming' : '/'}` : null,
    robots: !siteUrl || filtered ? 'noindex, follow' : 'index, follow, max-image-preview:large' };
}

export function robotsTxt(siteUrl) {
  return siteUrl ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';
}

export function sitemapXml(siteUrl) {
  // Rolling views change with the Bangkok date even without a sync; omit lastmod
  // rather than inventing a content modification date on every request.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/upcoming'].map(path => `<url><loc>${siteUrl}${path}</loc></url>`).join('')}</urlset>\n`;
}
