import { resolve } from 'node:path';
import { openCache } from './cache.js';
import { createSync } from './anilist.js';
const cache = openCache(resolve(process.env.DATABASE_PATH || 'data/anime.sqlite'));
const sync = createSync(cache);
try { await sync.refresh(true); if (sync.error('calendar') || sync.error('upcoming')) process.exitCode = 1; }
finally { cache.close(); }
