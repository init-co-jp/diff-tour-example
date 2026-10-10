import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MIGRATIONS_DIR = new URL('../db/migrations/', import.meta.url).pathname;

/** Opens the database and applies any pending migrations in numeric order */
export function openDatabase(path: string, migrationsDir = MIGRATIONS_DIR): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)');
  const applied = new Set(
    db.prepare('SELECT name FROM schema_migrations').all().map((r) => String(r.name)),
  );
  for (const name of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    if (applied.has(name)) continue;
    db.exec('BEGIN');
    try {
      db.exec(readFileSync(join(migrationsDir, name), 'utf8'));
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return db;
}
