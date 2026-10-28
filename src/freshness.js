import { dayKey, nextSeason, weekWindow } from './time.js';

// Both views refresh once per Bangkok calendar day, including after a restart.
export function isSnapshotFresh(snapshot, kind, now = Date.now()) {
  if (!snapshot || dayKey(snapshot.updatedAt) !== dayKey(now)) return false;
  const season = nextSeason(now);
  const key = kind === 'calendar' ? weekWindow(now).key : `${season.season}-${season.year}`;
  return snapshot.key === key && snapshot.data.every(row =>
    Object.hasOwn((kind === 'calendar' ? row.media : row) || {}, 'externalLinks'));
}
