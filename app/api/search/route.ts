import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q) return NextResponse.json({ students: [], enquiries: [] });
  const db = getDb();
  const like = `%${q}%`;
  const students = await db
    .prepare(
      `SELECT s.*, b.name as batch_name FROM students s LEFT JOIN batches b ON s.batch_id = b.id
       WHERE s.name LIKE ? OR s.mobile LIKE ? OR s.roll_number LIKE ? OR s.registration_number LIKE ?
         OR s.course LIKE ? OR b.name LIKE ?
       ORDER BY s.name LIMIT 30`
    )
    .all(like, like, like, like, like, like);
  const enquiries = await db
    .prepare(
      `SELECT * FROM enquiries WHERE student_name LIKE ? OR mobile LIKE ? OR course_interested LIKE ?
       ORDER BY created_at DESC LIMIT 20`
    )
    .all(like, like, like);
  return NextResponse.json({ students, enquiries });
}
