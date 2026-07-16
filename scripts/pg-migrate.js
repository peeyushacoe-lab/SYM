// Applies scripts/pg-schema.sql to the target Postgres database.
// Uses DIRECT_DATABASE_URL if set (preferred for DDL), else DATABASE_URL.
// Run with: node scripts/pg-migrate.js
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Set DIRECT_DATABASE_URL or DATABASE_URL in .env.local first.');
  process.exit(1);
}

const schema = fs.readFileSync(path.join(__dirname, 'pg-schema.sql'), 'utf8');
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

client
  .connect()
  .then(() => client.query(schema))
  .then(() =>
    client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
  )
  .then((res) => {
    console.log('Schema applied. Tables:', res.rows.map((r) => r.table_name).join(', '));
    return client.end();
  })
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
