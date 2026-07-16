import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('student');
  if ('error' in auth) return auth.error;
  const db = getDb();

  const student = (await db
    .prepare('SELECT s.*, b.name as batch_name, b.timing FROM students s LEFT JOIN batches b ON s.batch_id = b.id WHERE s.user_id = ?')
    .get(auth.session.id)) as any;

  if (!student) {
    return NextResponse.json({ error: 'No student profile is linked to this account yet.' }, { status: 404 });
  }

  const fees = await db.prepare('SELECT * FROM fees WHERE student_id = ? ORDER BY payment_date DESC').all(student.id);
  const attendance = await db
    .prepare('SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 30')
    .all(student.id);
  const presentCount = (attendance as any[]).filter((a) => a.status === 'Present').length;
  const attendancePct = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null;

  return NextResponse.json({ student, fees, attendance, attendancePct });
}
