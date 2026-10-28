import { dayKey, weekDays, nextSeason, thaiTime, TIME_ZONE, weekWindow } from './time.js';
import { platformIcons, streamingLinks } from './platforms.js';
import { airingState, nextAiringTime } from '../public/airing.js';
import { pageSeo } from './seo.js';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const e = escapeHtml;
const icon = (name, size = 20) => {
  const paths = { calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-13 5 2 2 4-4"/>', search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>', arrow: '<path d="M7 17 17 7M7 7h10v10"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>', chevron: '<path d="m9 5 7 7-7 7"/>', sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>' };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.calendar}</svg>`;
};
export function safeUrl(url, image = false) {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && (image ? parsed.hostname === 's4.anilist.co' : parsed.hostname === 'anilist.co') ? parsed.href : ''; } catch { return ''; }
}
export const titleOf = media => media.title?.romaji || media.title?.english || media.title?.native || 'ยังไม่ระบุชื่อ';
export function cleanDescription(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
function poster(media, upcoming = false, index = 0) {
  const url = safeUrl(media.coverImage?.large, true);
  return `<div class="poster${upcoming ? ' poster-tall' : ''}">${url ? `<img src="${e(url)}" alt="ปก ${e(titleOf(media))}" width="${upcoming ? 200 : 100}" height="${upcoming ? 285 : 145}" loading="${index < (upcoming ? 6 : 4) ? 'eager' : 'lazy'}" decoding="async" referrerpolicy="no-referrer">` : `<span class="poster-placeholder">${icon('calendar', 32)}</span>`}</div>`;
}
export function releaseDate(start = {}) {
  if (!start.year || !start.month) return 'ยังไม่ระบุวัน';
  const month = new Intl.DateTimeFormat('th-TH', { month: 'short', timeZone: TIME_ZONE }).format(new Date(Date.UTC(start.year, start.month - 1, 1)));
  return `${start.day ? `${start.day} ` : ''}${month} ${start.year}${start.day ? '' : ' · รอยืนยันวัน'}`;
}
function searchText(media) { return e([titleOf(media), media.title?.english, media.title?.native, ...(media.synonyms || [])].filter(Boolean).join(' ').toLowerCase()); }
function renderPlatforms(media) {
  const links = platformIcons(media);
  if (!links.length) return '';
  return `<div class="platforms" role="group" aria-label="ช่องทางรับชม">${links.map(link => `<a class="platform-icon" href="${e(link.url)}" target="_blank" rel="noopener noreferrer" title="รับชมทาง ${e(link.site)} · การรับชมขึ้นกับพื้นที่" aria-label="รับชมทาง ${e(link.site)} (เปิดแท็บใหม่)">${link.brand ? `<span class="platform-logo brand-${link.brand}" aria-hidden="true"></span>` : link.icon ? `<img src="${e(link.icon)}" width="20" height="20" loading="lazy" decoding="async" alt="" referrerpolicy="no-referrer">` : ''}<span class="platform-fallback" aria-hidden="true">▶</span></a>`).join('')}</div>`;
}
function card(media, { event, index, now, upcoming = false, nextAt = null }) {
  const title = titleOf(media);
  const status = event ? airingState(event.airingAt, media.duration, now) : null;
  const isNext = event && nextAt !== null && event.airingAt === nextAt;
  const source = safeUrl(media.siteUrl) || `https://anilist.co/anime/${Number(media.id)}`;
  return `<article class="anime-card${upcoming ? ' upcoming-card' : ''}${status?.state === 'live' ? ' is-live' : ''}${isNext ? ' is-next' : ''}" data-search="${searchText(media)}" data-format="${e(media.format || '')}" data-media-id="${Number(media.id)}"${event ? ` data-airing="${event.airingAt}" data-duration="${Number(media.duration) || 0}" data-state="${status.state}"` : ''}>
    <a class="poster-link" href="${e(source)}" data-detail="${Number(media.id)}" aria-label="รายละเอียด ${e(title)}">${poster(media, upcoming, index)}</a>
    <div class="card-content">${event ? `<div class="airing-status status-${status.state}" title="${e(status.hint)}"><span class="status-dot"></span><span data-status>${status.label}</span><span class="next-label" data-next-label${isNext ? '' : ' hidden'}>เรื่องถัดไป</span></div><time class="airing-time" datetime="${new Date(event.airingAt * 1000).toISOString()}">${thaiTime(event.airingAt)}<span> น.</span></time>` : `<div class="upcoming-format">${e(media.format?.replace('_', ' ') || 'ANIME')}${media.episodes ? ` · ${media.episodes} ตอน` : ''}</div>`}
    <h3><a href="${e(source)}" data-detail="${Number(media.id)}">${e(title)}</a></h3>
    ${event ? '<div class="card-footer">' : ''}
    ${event ? `<p class="episode">ตอนที่ ${event.episode}${media.episodes ? ` <span>/ ${media.episodes}</span>` : ''}</p>` : `<p class="release-date">${icon('calendar', 14)} ${e(releaseDate(media.startDate))}</p>`}
    <p class="genres">${event ? `${e(media.format?.replace('_', ' ') || 'ANIME')}<span class="separator">|</span>` : ''}${e((media.genres || []).slice(0, 2).join(' · '))}</p>
    ${renderPlatforms(media)}${event ? '</div>' : ''}</div></article>`;
}
const formats = ['TV', 'TV_SHORT', 'MOVIE', 'ONA', 'OVA', 'SPECIAL'];
function controls(params, total, upcoming) {
  return `<form class="toolbar" role="search" method="get" action="${upcoming ? '/upcoming' : '/'}">
    <label class="search-field">${icon('search')}<input type="search" name="q" id="search" placeholder="ค้นหาอนิเมะ..." aria-label="ค้นหาอนิเมะ" value="${e(params.q)}" autocomplete="off"><kbd aria-hidden="true">/</kbd></label>
    <label class="format-label"><span class="sr-only">ประเภทอนิเมะ</span><select id="format" name="format"><option value="">ทุกประเภท</option>${formats.map(f => `<option value="${f}"${params.format === f ? ' selected' : ''}>${f.replace('_',' ')}</option>`).join('')}</select></label>
    ${!upcoming ? `<label class="future-filter"><input id="future" type="checkbox" name="future" value="1"${params.future ? ' checked' : ''}> ยังไม่ฉาย</label>` : ''}
    <noscript><button class="button" type="submit">ค้นหา</button></noscript><span class="result-count" aria-live="polite"><b id="result-count">${total}</b> <span>${upcoming ? 'เรื่อง' : 'รายการ'}</span></span>
  </form>`;
}
function matches(media, event, params, now) {
  const text = [titleOf(media), media.title?.english, media.title?.native, ...(media.synonyms || [])].join(' ').toLowerCase();
  return (!params.q || text.includes(params.q.toLowerCase())) && (!params.format || media.format === params.format) && (!params.future || !event || event.airingAt * 1000 > now);
}
function shell(content, { upcoming, updatedAt, now, data, cacheMissing, error, key, siteUrl, params, listedMedia }) {
  const update = updatedAt ? new Intl.DateTimeFormat('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE }).format(new Date(updatedAt)) : '';
  const stale = updatedAt && dayKey(updatedAt) !== dayKey(now);
  const banner = error ? `<div class="notice" role="status">${cacheMissing ? 'ยังเชื่อมต่อข้อมูลไม่ได้ กำลังลองใหม่อัตโนมัติ' : 'เชื่อมต่อแหล่งข้อมูลไม่ได้ชั่วคราว กำลังแสดงข้อมูลที่บันทึกไว้'}<button class="text-button" data-reload>ลองอีกครั้ง</button></div>` : cacheMissing ? `<div class="notice" role="status">กำลังโหลดข้อมูลจาก AniList ครั้งแรก หน้านี้จะอัปเดตให้อัตโนมัติ</div>` : stale ? `<div class="notice" role="status">ข้อมูลอาจยังไม่ล่าสุด กำลังอัปเดตเบื้องหลัง</div>` : '';
  const seo = pageSeo({ siteUrl, upcoming, now, params });
  const graph = siteUrl && !cacheMissing ? { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebSite', '@id': `${siteUrl}/#website`, url: `${siteUrl}/`, name: 'anime / calendar', inLanguage: 'th' },
    { '@type': 'CollectionPage', '@id': `${seo.canonical}#webpage`, url: seo.canonical, name: seo.title, description: seo.description,
      inLanguage: 'th', isPartOf: { '@id': `${siteUrl}/#website` }, mainEntity: {
        '@type': 'ItemList', numberOfItems: listedMedia.length,
        itemListElement: listedMedia.map((media, index) => ({ '@type': 'ListItem', position: index + 1,
          item: { '@type': 'CreativeWork', name: titleOf(media), url: safeUrl(media.siteUrl) || `https://anilist.co/anime/${Number(media.id)}` } }))
      } }
  ] } : null;
  const seoHead = `<title>${e(seo.title)}</title><meta name="description" content="${e(seo.description)}"><meta name="robots" content="${seo.robots}">
    ${seo.canonical ? `<link rel="canonical" href="${e(seo.canonical)}"><meta property="og:url" content="${e(seo.canonical)}">` : ''}
    <meta property="og:type" content="website"><meta property="og:locale" content="th_TH"><meta property="og:site_name" content="anime / calendar"><meta property="og:title" content="${e(seo.title)}"><meta property="og:description" content="${e(seo.description)}">
    <meta name="twitter:card" content="summary"><meta name="twitter:title" content="${e(seo.title)}"><meta name="twitter:description" content="${e(seo.description)}">
    ${graph ? `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>` : ''}`;
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#e9f3f5">${seoHead}<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/style.css"><script src="/app.js" type="module"></script></head>
    <body data-page="${upcoming ? 'upcoming' : 'calendar'}" data-day="${dayKey(now)}" data-cache-key="${e(key)}" data-updated="${updatedAt || 0}" data-missing="${cacheMissing ? 'true' : 'false'}"><a class="skip-link" href="#main">ข้ามไปเนื้อหา</a>
    <header class="header"><div class="header-inner"><a class="brand" href="/" aria-label="anime calendar หน้าหลัก">${icon('calendar', 27)}<span>anime <span class="brand-slash">/</span> calendar</span></a><nav aria-label="เมนูหลัก"><a href="/"${!upcoming ? ' aria-current="page"' : ''}>ตารางฉาย</a><a href="/upcoming"${upcoming ? ' aria-current="page"' : ''}>Upcoming</a></nav><span class="timezone">${icon('clock', 15)} เวลาไทย <span>· UTC+7</span></span></div></header>
    <main class="container" id="main">${banner}${content}</main>
    <footer class="footer container"><div>ข้อมูลจาก <a href="https://anilist.co" target="_blank" rel="noopener noreferrer">AniList ${icon('arrow', 12)}</a>${update ? `<span class="updated">อัปเดต ${e(update)}</span>` : ''}</div><p>เวลาฉายต้นฉบับญี่ปุ่น แสดงเป็นเวลาไทย<span>กำหนดการอาจเปลี่ยนแปลงได้</span></p></footer>
    <dialog id="detail-dialog" aria-labelledby="detail-title"><button class="dialog-close" aria-label="ปิดรายละเอียด">${icon('close', 22)}</button><div id="detail-content"></div></dialog>
    <script id="media-data" type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script></body></html>`;
}
export function renderPage({ snapshot, upcoming = false, now = Date.now(), error, params = {}, siteUrl = null }) {
  params = { q: params.q || '', format: params.format || '', future: params.future || false };
  const days = weekDays(now);
  const season = nextSeason(now);
  const key = upcoming ? `${season.season}-${season.year}` : days[0].key;
  // Never expose a previous season. Old calendar snapshots are intersected with today's window.
  const validSnapshot = !upcoming || snapshot?.key === key ? snapshot : null;
  const { start, end } = weekWindow(now);
  const rows = (validSnapshot?.data || []).filter(row => upcoming || (row.airingAt >= start && row.airingAt < end));
  const filtered = rows.filter(row => matches(upcoming ? row : row.media, upcoming ? null : row, params, now));
  const nextAt = upcoming ? null : nextAiringTime(filtered.map(row => row.airingAt), now);
  const title = upcoming ? 'อนิเมะซีซั่นหน้า มีอะไรดู?' : 'ตารางฉายอนิเมะวันนี้';
  let content = `<section class="page-heading"><div><h1>${title}</h1><p>${upcoming ? 'อนิเมะที่กำลังจะเริ่มฉายในซีซั่นถัดไป เตรียมลิสต์เรื่องที่อยากดู' : 'ตารางอนิเมะประจำสัปดาห์ อัปเดตตามเวลาไทย'}</p></div>${upcoming ? `<span class="season-label">${icon('sparkles', 18)} ${season.season} ${season.year}</span>` : `<a href="#day-${days[0].key}" class="button today-button">${icon('calendar',16)} กลับมาวันนี้</a>`}</section>`;
  if (upcoming) {
    content += `<div class="season-strip"><span>${season.season} ${season.year}</span><span>${season.months}</span><span>เฉพาะเรื่องที่ยังไม่เริ่มฉาย</span></div>${controls(params, filtered.length, true)}<section class="upcoming-grid" aria-label="อนิเมะซีซั่นหน้า">${rows.map((m,index) => card(m,{ upcoming: true,index,now })).join('')}</section><div class="empty-state" id="no-results"${filtered.length ? ' hidden' : ''}>${icon('calendar',32)}<h2>${rows.length ? 'ไม่พบอนิเมะที่ค้นหา' : validSnapshot ? 'ยังไม่มีรายชื่อซีซั่นถัดไป' : 'รอข้อมูลซีซั่นถัดไปสักครู่'}</h2><p>${rows.length ? 'ลองเปลี่ยนคำค้นหาหรือประเภทอนิเมะ' : 'เมื่อแหล่งข้อมูลประกาศกำหนดการ รายชื่อจะปรากฏที่นี่'}</p></div>`;
  } else {
    content += `<nav class="week-nav" aria-label="เลือกวันออกอากาศ">${days.map((d,index) => `<a class="day-tab${index === 0 ? ' active' : ''}" href="#day-${d.key}"${index === 0 ? ' aria-current="date"' : ''}><span>${e(d.short)}</span><b>${d.number}</b><small>${index === 0 ? 'วันนี้' : index === 1 ? 'พรุ่งนี้' : new Intl.DateTimeFormat('th-TH', { month:'short',timeZone:TIME_ZONE }).format(new Date(d.timestamp))}</small></a>`).join('')}</nav>${controls(params, filtered.length, false)}`;
    content += days.map((d,index) => {
      const events = rows.filter(row => dayKey(row.airingAt * 1000) === d.key);
      const visible = filtered.filter(row => dayKey(row.airingAt * 1000) === d.key).length;
      return `<section class="day-section" id="day-${d.key}" aria-labelledby="heading-${d.key}"><div class="section-heading"><h2 id="heading-${d.key}">${e(d.label)}</h2>${index === 0 ? '<span class="today-badge">วันนี้</span>' : ''}<span class="heading-line"></span><span class="section-count"><b data-day-count>${visible}</b> รายการ</span></div><div class="schedule-grid">${events.map((event,i) => card(event.media,{event,index: i + index * 10,now,nextAt})).join('')}</div><p class="day-empty"${visible ? ' hidden' : ''}>${events.length ? 'ไม่พบรายการที่ตรงกับการค้นหา' : 'ยังไม่มีข้อมูลออกอากาศในวันนี้'}</p></section>`;
    }).join('');
    content += `<div class="schedule-note">${icon('clock',16)}<p>เปิดมาเจอวันนี้ เลื่อนดูต่อได้อีก 6 วัน<span>เวลาแสดงตาม Asia/Bangkok · ไม่มีหน้าตารางย้อนหลัง</span></p></div>`;
  }
  // Apply filters on the server as well; the small client script then updates these states instantly.
  for (const row of rows) {
    const m = upcoming ? row : row.media;
    if (!matches(m, upcoming ? null : row, params, now)) {
      // IDs are numeric and the exact marker occurs only on the corresponding cards.
      const marker = `data-media-id="${Number(m.id)}"${upcoming ? '' : ` data-airing="${row.airingAt}"`}`;
      content = content.replaceAll(marker, `${marker} hidden`);
    }
  }
  const data = Object.fromEntries(rows.map(row => { const m = upcoming ? row : row.media; return [m.id, { id:m.id,title:titleOf(m),english:m.title?.english,native:m.title?.native,cover:safeUrl(m.coverImage?.large,true),description:cleanDescription(m.description),genres:m.genres || [],studio:m.studios?.nodes?.map(s=>s.name).join(', '),format:m.format,episodes:m.episodes,platforms:streamingLinks(m),url:safeUrl(m.siteUrl) || `https://anilist.co/anime/${Number(m.id)}` }]; }));
  const listedMedia = [...new Map(filtered.map(row => { const m = upcoming ? row : row.media; return [m.id, m]; })).values()];
  return shell(content,{upcoming,now,updatedAt:validSnapshot?.updatedAt,data,cacheMissing:!validSnapshot,error,key,siteUrl,params,listedMedia});
}
