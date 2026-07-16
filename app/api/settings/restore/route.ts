import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { tableColumns } from '@/lib/pg';

const TABLES = ['batches', 'students', 'staff', 'enquiries', 'fees', 'expenses'] as const;

// Tables added after the backup/restore feature was built that still hold
// foreign keys into students/batches/staff. They aren't part of the backup
// payload, but they must be cleared before students/batches/staff can be
// deleted, or the delete fails on a foreign-key violation.
const DEPENDENT_TABLES = [
  'exam_marks',
  'leave_requests',
  'queries',
  'attendance',
  'payments',
  'timetable_slots',
  'teacher_batches',
  'student_guardians',
  'exams',
  'notices',
] as const;

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

  const restore = db.transaction(async () => {
    // Delete children first to respect foreign keys
    for (const table of DEPENDENT_TABLES) {
      await db.prepare(`DELETE FROM ${table}`).run();
    }
    for (const table of [...TABLES].reverse()) {
      await db.prepare(`DELETE FROM ${table}`).run();
    }
    for (const table of TABLES) {
      const rows: Record<string, any>[] = Array.isArray(backup.data[table]) ? backup.data[table] : [];
      if (!rows.length) {
        counts[table] = 0;
        continue;
      }
      const tableCols = await tableColumns(table);
      let inserted = 0;
      for (const row of rows) {
        const cols = Object.keys(row).filter((k) => tableCols.includes(k));
        if (!cols.length) continue;
        await db
          .prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => `@${c}`).join(', ')})`)
          .run(Object.fromEntries(cols.map((c) => [c, row[c] ?? null])));
        inserted++;
      }
      counts[table] = inserted;
      // Restored rows carry explicit ids, so the table's auto-increment
      // sequence needs to be fast-forwarded past them to avoid future
      // primary-key collisions on the next plain insert.
      await db.exec(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`
      );
    }
  });

  try {
    await restore();
  } catch (e: any) {
    return NextResponse.json({ error: `Restore failed: ${e.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, counts });
}
