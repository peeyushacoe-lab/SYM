import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const search = req.nextUrl.searchParams.get('search') || '';
  const db = getDb();
  let query = `SELECT f.*, s.name as student_name, s.mobile, s.batch_id, b.name as batch_name,
      (SELECT gu.name FROM student_guardians sg JOIN users gu ON gu.id = sg.guardian_user_id
        WHERE sg.student_id = s.id LIMIT 1) as guardian_name,
      (SELECT gu.mobile FROM student_guardians sg JOIN users gu ON gu.id = sg.guardian_user_id
        WHERE sg.student_id = s.id LIMIT 1) as guardian_mobile
    FROM fees f LEFT JOIN students s ON f.student_id = s.id
    LEFT JOIN batches b ON s.batch_id = b.id WHERE f.remaining_due > 0`;
  const params: any[] = [];
  if (search) {
    query += ' AND (s.name ILIKE ? OR s.mobile ILIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY f.remaining_due DESC';
  const items = await db.prepare(query).all(...params);
  return NextResponse.json({ items });
}
