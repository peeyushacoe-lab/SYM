import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

const TABLES = ['batches', 'students', 'staff', 'enquiries', 'fees', 'expenses'] as const;

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;

  let backup: any;
  try {
    backup = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid backup file.' }, { status: 400 });
  }
  if (!backup?.data || typeof backup.data !== 'object') {
    return NextResponse.json({ error: 'Not a valid SYM backup file (missing data).' }, { status: 400 });
  }

  const db = getDb();
  const counts: Record<string, number> = {};

  const restore = db.transaction(() => {
    // Delete children first to respect foreign keys
    for (const table of [...TABLES].reverse()) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    for (const table of TABLES) {
      const rows: Record<string, any>[] = Array.isArray(backup.data[table]) ? backup.data[table] : [];
      if (!rows.length) {
        counts[table] = 0;
        continue;
      }
      const tableCols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
      let inserted = 0;
      for (const row of rows) {
        const cols = Object.keys(row).filter((k) => tableCols.includes(k));
        if (!cols.length) continue;
        db.prepare(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => `@${c}`).join(', ')})`
        ).run(Object.fromEntries(cols.map((c) => [c, row[c] ?? null])));
        inserted++;
      }
      counts[table] = inserted;
    }
  });

  try {
    restore();
  } catch (e: any) {
    return NextResponse.json({ error: `Restore failed: ${e.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, counts });
}
