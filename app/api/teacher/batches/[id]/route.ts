import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('teacher');
  if ('error' in auth) return auth.error;
  const db = getDb();

  const owns = db
    .prepare('SELECT 1 FROM teacher_batches WHERE teacher_user_id = ? AND batch_id = ?')
    .get(auth.session.id, params.id);
  if (!owns) return NextResponse.json({ error: 'Not authorized for this batch.' }, { status: 403 });

  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(params.id);
  const students = db
    .prepare('SELECT id, name, mobile, roll_number, photo FROM students WHERE batch_id = ? ORDER BY name')
    .all(params.id);

  const date = req.nextUrl.searchParams.get('date');
  let attendance: any[] = [];
  if (date) {
    attendance = db
      .prepare('SELECT student_id, status FROM attendance WHERE batch_id = ? AND date = ?')
      .all(params.id, date);
  }

  return NextResponse.json({ batch, students, attendance });
}
