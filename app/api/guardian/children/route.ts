import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('guardian');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const children = await db
    .prepare(
      `SELECT s.*, b.name as batch_name,
        COALESCE((SELECT SUM(remaining_due) FROM fees WHERE student_id = s.id), 0) as due_amount
       FROM student_guardians sg
       JOIN students s ON sg.student_id = s.id
       LEFT JOIN batches b ON s.batch_id = b.id
       WHERE sg.guardian_user_id = ?
       ORDER BY s.name`
    )
    .all(auth.session.id);
  return NextResponse.json({ items: children });
}
