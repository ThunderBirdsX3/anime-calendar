import { brandForSite } from './platform-brands.js';
// AniList's language describes linked content; it does not establish subtitle/dub availability.
export function streamingUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
function iconUrl(value) {
  const url = streamingUrl(value);
  return url && new URL(url).hostname === 's4.anilist.co' ? url : '';
}
export function streamingLinks(media) {
  const links = new Map();
  for (const link of media.externalLinks || []) {
    if (!link || link.type !== 'STREAMING' || link.isDisabled || !link.site?.trim()) continue;
    const url = streamingUrl(link.url);
    if (!url) continue;
    const notes = link.notes?.trim() || '';
    const noteLabel = !notes ? '' : /\b(?:subs?|dub(?:bed|s)?|subtitles?|subbed)\b|ซับ|พากย์/i.test(notes) ? 'SUB/DUB' : 'หมายเหตุ';
    const value = { site: link.site.trim(), url, icon: iconUrl(link.icon), brand: brandForSite(link.site.trim()), language: link.language?.trim() || '', notes, noteLabel };
    // Keep distinct language/availability notes even if they share a destination.
    links.set(JSON.stringify([url, value.language, value.notes]), value);
  }
  return [...links.values()];
}
export function platformIcons(media) {
  return [...new Map(streamingLinks(media).map(link => [link.site.toLowerCase(), link])).values()];
}
