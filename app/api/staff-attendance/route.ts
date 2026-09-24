import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

// GET ?month=YYYY-MM -> all staff with their day-by-day statuses for that month
export async function GET(req: NextRequest) {
  const auth = await requireRole('management', 'staff_admin');
  if ('error' in auth) return auth.error;
  const month = req.nextUrl.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const db = getDb();
  const staff = await db.prepare('SELECT id, name, designation FROM staff WHERE school_id = ? ORDER BY name').all(auth.session.schoolId);
  const records = await db
    .prepare('SELECT staff_id, date, status FROM staff_attendance WHERE date LIKE ? AND staff_id IN (SELECT id FROM staff WHERE school_id = ?)')
    .all(`${month}%`, auth.session.schoolId);
  return NextResponse.json({ staff, records, month });
}

// POST { staff_id, date, status } -> upsert one cell (status '' deletes)
export async function POST(req: NextRequest) {
  const auth = await requireRole('management', 'staff_admin');
  if ('error' in auth) return auth.error;
  const { staff_id, date, status } = await req.json();
  if (!staff_id || !date) {
    return NextResponse.json({ error: 'staff_id and date are required.' }, { status: 400 });
  }
  const db = getDb();
  const staffRow = await db.prepare('SELECT id FROM staff WHERE id = ? AND school_id = ?').get(staff_id, auth.session.schoolId);
  if (!staffRow) return NextResponse.json({ error: 'Staff not found.' }, { status: 404 });
  if (!status) {
    await db.prepare('DELETE FROM staff_attendance WHERE staff_id = ? AND date = ?').run(staff_id, date);
    return NextResponse.json({ ok: true });
  }
  await db
    .prepare(
      `INSERT INTO staff_attendance (staff_id, date, status, marked_by) VALUES (@staff_id, @date, @status, @marked_by)
       ON CONFLICT(staff_id, date) DO UPDATE SET status = excluded.status, marked_by = excluded.marked_by`
    )
    .run({ staff_id, date, status, marked_by: auth.session.id });
  return NextResponse.json({ ok: true });
}
