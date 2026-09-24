import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { tableColumns } from '@/lib/pg';

// Order matters for insertion: parents before children (batches/students
// before student_fee_items, which fee rows reference via fee_item_id).
const TABLES = ['batches', 'students', 'student_fee_items', 'staff', 'enquiries', 'fees', 'expenses'] as const;

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
  'homework',
  'lesson_plans',
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
  const schoolId = auth.session.schoolId;

  const restore = db.transaction(async () => {
    // Delete children first to respect foreign keys. Every one of these
    // tables carries its own school_id, so scope every delete to THIS
    // school only — an unscoped DELETE here would wipe every other
    // school's data on the instance from a single school's restore.
    for (const table of DEPENDENT_TABLES) {
      await db.prepare(`DELETE FROM ${table} WHERE school_id = ?`).run(schoolId);
    }
    for (const table of [...TABLES].reverse()) {
      await db.prepare(`DELETE FROM ${table} WHERE school_id = ?`).run(schoolId);
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
        const cols = Object.keys(row).filter((k) => tableCols.includes(k) && k !== 'school_id');
        if (!cols.length) continue;
        // Force school_id to the restoring school regardless of what the
        // backup file says, so a backup can never plant rows into another
        // tenant (or leave them ownerless with a stale/foreign school_id).
        const insertCols = [...cols, 'school_id'];
        await db
          .prepare(`INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${insertCols.map((c) => `@${c}`).join(', ')})`)
          .run({ ...Object.fromEntries(cols.map((c) => [c, row[c] ?? null])), school_id: schoolId });
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
