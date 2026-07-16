// Plain-JS mirror of lib/pg.ts for standalone Node scripts (seeding etc.)
// that can't easily import the TS module without a build step.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Pool, types } = require('pg');

// See lib/pg.ts for why: pg returns bigint (COUNT(*)) as strings by default.
types.setTypeParser(20, (val) => parseInt(val, 10));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Set DATABASE_URL in .env.local first.');
  process.exit(1);
}
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

function convertPlaceholders(sql) {
  if (/@\w+/.test(sql)) {
    const names = [];
    const converted = sql.replace(/@(\w+)/g, (_m, name) => {
      names.push(name);
      return `$${names.length}`;
    });
    return { sql: converted, paramNames: names };
  }
  let i = 0;
  const converted = sql.replace(/\?/g, () => `$${++i}`);
  return { sql: converted, paramNames: null };
}

function needsReturningId(sql) {
  return /^\s*insert/i.test(sql) && !/returning/i.test(sql);
}

function prepare(sql) {
  const { sql: converted, paramNames } = convertPlaceholders(sql);
  const runSql = needsReturningId(converted) ? `${converted} RETURNING id` : converted;

  function resolveParams(args) {
    if (paramNames) {
      const obj = args[0] || {};
      return paramNames.map((name) => (obj[name] === undefined ? null : obj[name]));
    }
    return args.map((a) => (a === undefined ? null : a));
  }

  return {
    async all(...args) {
      const res = await pool.query(converted, resolveParams(args));
      return res.rows;
    },
    async get(...args) {
      const res = await pool.query(converted, resolveParams(args));
      return res.rows[0];
    },
    async run(...args) {
      const res = await pool.query(runSql, resolveParams(args));
      return { lastInsertRowid: res.rows[0]?.id, changes: res.rowCount ?? 0 };
    },
  };
}

async function exec(sql) {
  await pool.query(sql);
}

async function end() {
  await pool.end();
}

module.exports = { prepare, exec, end };
