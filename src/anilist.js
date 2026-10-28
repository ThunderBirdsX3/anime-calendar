import { setTimeout as pause } from 'node:timers/promises';
import { weekWindow, nextSeason } from './time.js';
import { isSnapshotFresh } from './freshness.js';
const FIELDS = `id title { romaji english native } synonyms coverImage { large color } format episodes duration genres description(asHtml: false) startDate { year month day } studios(isMain:true) { nodes { name } } externalLinks { site url type language notes icon isDisabled } siteUrl isAdult countryOfOrigin`;
const CALENDAR_QUERY = `query($page:Int!,$from:Int!,$to:Int!) { Page(page:$page,perPage:50) { pageInfo { hasNextPage } airingSchedules(airingAt_greater:$from,airingAt_lesser:$to,sort:TIME) { id airingAt episode media { ${FIELDS} } } } }`;
const UPCOMING_QUERY = `query($page:Int!,$season:MediaSeason!,$year:Int!) { Page(page:$page,perPage:50) { pageInfo { hasNextPage } media(type:ANIME,season:$season,seasonYear:$year,status:NOT_YET_RELEASED,isAdult:false,countryOfOrigin:JP,sort:POPULARITY_DESC) { ${FIELDS} } } }`;
export class AniListError extends Error {
  constructor(message, retryAfter = 60) { super(message); this.retryAfter = retryAfter; }
}
export function createAniList({ fetcher = fetch, delay = 2200 } = {}) {
  let nextRequest = 0;
  async function request(query, variables) {
    if (nextRequest > Date.now()) await pause(nextRequest - Date.now());
    nextRequest = Date.now() + delay;
    const response = await fetcher('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
      const retry = Number(response.headers.get('retry-after')) || 60;
      if (response.status === 429) nextRequest = Date.now() + retry * 1000;
      throw new AniListError(`AniList HTTP ${response.status}`, Math.min(Math.max(retry, 60), 3600));
    }
    const result = await response.json();
    if (result.errors?.length || !result.data?.Page) throw new AniListError(result.errors?.[0]?.message || 'Invalid AniList response');
    return result.data.Page;
  }
  async function pages(query, variables, field) {
    const rows = [];
    for (let page = 1; page <= 100; page++) {
      const result = await request(query, { ...variables, page });
      if (!Array.isArray(result[field]) || typeof result.pageInfo?.hasNextPage !== 'boolean') throw new AniListError('Incomplete AniList page');
      rows.push(...result[field]);
      if (!result.pageInfo.hasNextPage) return rows;
    }
    throw new AniListError('Pagination limit reached');
  }
  return {
    async calendar(now = Date.now()) {
      const { start, end, key } = weekWindow(now);
      const rows = await pages(CALENDAR_QUERY, { from: start - 1, to: end }, 'airingSchedules');
      const data = rows.filter(row => row.media && !row.media.isAdult && row.media.countryOfOrigin === 'JP' && row.airingAt >= start && row.airingAt < end);
      return { key, data: [...new Map(data.map(row => [row.id, row])).values()].sort((a,b) => a.airingAt - b.airingAt) };
    },
    async upcoming(now = Date.now()) {
      const season = nextSeason(now);
      const data = await pages(UPCOMING_QUERY, { season: season.season, year: season.year }, 'media');
      return { key: `${season.season}-${season.year}`, data: data.filter(row => row && !row.isAdult && row.countryOfOrigin === 'JP') };
    }
  };
}
export function createSync(cache, api = createAniList(), { clock = Date.now } = {}) {
  let pending = null;
  const errors = new Map();
  const retryAt = new Map();
  async function run(force) {
    for (const kind of ['calendar', 'upcoming']) {
      const now = clock();
      const cached = cache.get(kind);
      if (!force && ((retryAt.get(kind) || 0) > now || isSnapshotFresh(cached, kind, now))) continue;
      try {
        const snapshot = await api[kind](now);
        // Use the query's day so a fetch crossing midnight refreshes the new day too.
        cache.set(kind, snapshot.key, snapshot.data, now);
        errors.delete(kind); retryAt.delete(kind);
        console.log(`[sync] ${kind}: ${snapshot.data.length} records`);
      } catch (error) {
        errors.set(kind, error.message);
        retryAt.set(kind, clock() + (error.retryAfter || 60) * 1000);
        console.error(`[sync] ${kind}: ${error.message}`);
      }
    }
  }
  return { refresh(force = false) { if (!pending) pending = run(force).finally(() => { pending = null; }); return pending; }, get syncing() { return !!pending; }, error(kind) { return errors.get(kind); } };
}
