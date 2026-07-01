import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('teacher');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const items = db
    .prepare(
      `SELECT b.*, COUNT(s.id) as student_count FROM teacher_batches tb
       JOIN batches b ON tb.batch_id = b.id
       LEFT JOIN students s ON s.batch_id = b.id
       WHERE tb.teacher_user_id = ?
       GROUP BY b.id ORDER BY b.name`
    )
    .all(auth.session.id);
  return NextResponse.json({ items });
}
