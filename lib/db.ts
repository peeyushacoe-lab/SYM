import { prepare, exec, transaction, Statement } from './pg';

// Postgres-backed replacement for the old better-sqlite3 db handle. The
// schema itself lives in scripts/pg-schema.sql (applied once via
// scripts/pg-migrate.js), not created lazily here - Postgres isn't a local
// file we can silently (re)initialize on every cold start the way SQLite was.
//
// getDb() stays synchronous so call sites don't need `await getDb()`; only
// the query methods (.all/.get/.run) are async now and must be awaited.
export interface Db {
  prepare(sql: string): Statement;
  exec(sql: string): Promise<void>;
  transaction: typeof transaction;
}

const db: Db = { prepare, exec, transaction };

function getDb(): Db {
  return db;
}

export default getDb;
