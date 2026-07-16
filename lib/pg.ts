import { Pool, PoolClient, types } from 'pg';
import { AsyncLocalStorage } from 'async_hooks';

// pg returns bigint (COUNT(*), etc.) as strings by default to avoid silent
// precision loss beyond Number.MAX_SAFE_INTEGER. This app's counts never
// get remotely close to that, and the old better-sqlite3 driver always
// returned plain numbers, so parse int8 (OID 20) back to a JS number to
// match that behavior and avoid string-vs-number bugs at call sites.
types.setTypeParser(20, (val: string) => parseInt(val, 10));

declare global {
  // eslint-disable-next-line no-var
  var __symPgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!global.__symPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set.');
    global.__symPgPool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false },
    });
  }
  return global.__symPgPool;
}

// Lets nested db.prepare(...) calls made inside a transaction() callback
// automatically run on the same checked-out client, without callers having
// to thread a transaction handle through manually.
const txContext = new AsyncLocalStorage<PoolClient>();

async function rawQuery(text: string, params: any[]) {
  const client = txContext.getStore();
  if (client) return client.query(text, params);
  return getPool().query(text, params);
}

interface ConvertedQuery {
  sql: string;
  paramNames: string[] | null;
}

function convertPlaceholders(sql: string): ConvertedQuery {
  if (/@\w+/.test(sql)) {
    const names: string[] = [];
    const converted = sql.replace(/@(\w+)/g, (_match, name: string) => {
      names.push(name);
      return `$${names.length}`;
    });
    return { sql: converted, paramNames: names };
  }
  let i = 0;
  const converted = sql.replace(/\?/g, () => `$${++i}`);
  return { sql: converted, paramNames: null };
}

function needsReturningId(sql: string) {
  return /^\s*insert/i.test(sql) && !/returning/i.test(sql);
}

export interface RunResult {
  lastInsertRowid: number | undefined;
  changes: number;
}

export interface Statement {
  all<T = any>(...args: any[]): Promise<T[]>;
  get<T = any>(...args: any[]): Promise<T | undefined>;
  run(...args: any[]): Promise<RunResult>;
}

export function prepare(sql: string): Statement {
  const { sql: converted, paramNames } = convertPlaceholders(sql);
  const runSql = needsReturningId(converted) ? `${converted} RETURNING id` : converted;

  function resolveParams(args: any[]): any[] {
    if (paramNames) {
      const obj = args[0] || {};
      return paramNames.map((name) => (obj[name] === undefined ? null : obj[name]));
    }
    return args.map((a) => (a === undefined ? null : a));
  }

  return {
    async all<T = any>(...args: any[]): Promise<T[]> {
      const res = await rawQuery(converted, resolveParams(args));
      return res.rows;
    },
    async get<T = any>(...args: any[]): Promise<T | undefined> {
      const res = await rawQuery(converted, resolveParams(args));
      return res.rows[0];
    },
    async run(...args: any[]): Promise<RunResult> {
      const res = await rawQuery(runSql, resolveParams(args));
      return { lastInsertRowid: res.rows[0]?.id, changes: res.rowCount ?? 0 };
    },
  };
}

// Runs a batch of semicolon-separated DDL/DML statements with no params
// (used for schema setup). Simple-query protocol allows multiple statements.
export async function exec(sql: string): Promise<void> {
  const client = txContext.getStore();
  if (client) {
    await client.query(sql);
  } else {
    await getPool().query(sql);
  }
}

export function transaction<Args extends any[], Result>(
  fn: (...args: Args) => Result | Promise<Result>
): (...args: Args) => Promise<Result> {
  return async (...args: Args): Promise<Result> => {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await txContext.run(client, () => fn(...args));
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };
}

export async function tableColumns(tableName: string): Promise<string[]> {
  const res = await rawQuery(
    'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
    ['public', tableName]
  );
  return res.rows.map((r: any) => r.column_name);
}
