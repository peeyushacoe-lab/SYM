import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('guardian');
  if ('error' in auth) return auth.error;
  const db = getDb();

  const owns = db
    .prepare('SELECT 1 FROM student_guardians WHERE guardian_user_id = ? AND student_id = ?')
    .get(auth.session.id, params.id);
  if (!owns) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const student = db
    .prepare('SELECT s.*, b.name as batch_name, b.timing FROM students s LEFT JOIN batches b ON s.batch_id = b.id WHERE s.id = ?')
    .get(params.id);
  const fees = db.prepare('SELECT * FROM fees WHERE student_id = ? ORDER BY payment_date DESC').all(params.id);
  const attendance = db
    .prepare('SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 30')
    .all(params.id);
  const presentCount = (attendance as any[]).filter((a) => a.status === 'Present').length;
  const attendancePct = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null;

  return NextResponse.json({ student, fees, attendance, attendancePct });
}
