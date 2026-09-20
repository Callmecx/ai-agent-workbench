import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createSeed } from '../mock/seed.js';
const file = resolve(process.env.DATA_FILE || 'server/data/workbench.json');
export type Database = ReturnType<typeof createSeed>;
function load(): Database {
  if (!existsSync(file)) return createSeed();
  try { return JSON.parse(readFileSync(file, 'utf8')) as Database; }
  catch { throw new Error('Cannot read local data file. Back up and repair it before restarting.'); }
}
export const db = load();
export function save() {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, JSON.stringify(db, null, 2)); renameSync(`${file}.tmp`, file);
}
export function record(entry: Omit<Database['records'][number], 'id' | 'timestamp'>) {
  db.records.push({ ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() });
  if (db.records.length > 10000) db.records.splice(0, db.records.length - 10000);
  save();
}
