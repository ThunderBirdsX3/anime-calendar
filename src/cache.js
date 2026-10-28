import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const Database = process.versions.bun
  ? (await import('bun:sqlite')).Database
  : (await import('node:sqlite')).DatabaseSync;
export function openCache(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS snapshots (kind TEXT PRIMARY KEY, cache_key TEXT NOT NULL, payload TEXT NOT NULL, updated_at INTEGER NOT NULL)');
  const read = db.prepare('SELECT * FROM snapshots WHERE kind = ?');
  const write = db.prepare('INSERT INTO snapshots (kind,cache_key,payload,updated_at) VALUES (?,?,?,?) ON CONFLICT(kind) DO UPDATE SET cache_key=excluded.cache_key,payload=excluded.payload,updated_at=excluded.updated_at');
  return {
    get(kind) { const row = read.get(kind); return row ? { key: row.cache_key, data: JSON.parse(row.payload), updatedAt: row.updated_at } : null; },
    set(kind, key, data, now = Date.now()) { write.run(kind, key, JSON.stringify(data), now); },
    close() { db.close(); }
  };
}
