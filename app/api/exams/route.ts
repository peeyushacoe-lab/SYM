import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { teacherOwnsBatch } from '@/lib/portal';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const batchId = req.nextUrl.searchParams.get('batch_id');

  let sql = `SELECT e.*, b.name as batch_name,
      (SELECT COUNT(*) FROM exam_marks m WHERE m.exam_id = e.id) as marks_entered,
      (SELECT COUNT(*) FROM students s WHERE s.batch_id = e.batch_id) as student_count
    FROM exams e LEFT JOIN batches b ON e.batch_id = b.id`;
  const where: string[] = [];
  const params: any[] = [];

  if (auth.session.role === 'teacher') {
    where.push('e.batch_id IN (SELECT batch_id FROM teacher_batches WHERE teacher_user_id = ?)');
    params.push(auth.session.id);
  }
  if (batchId) {
    where.push('e.batch_id = ?');
    params.push(batchId);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY e.exam_date DESC, e.id DESC';

  const items = await db.prepare(sql).all(...params);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name || !data.batch_id) {
    return NextResponse.json({ error: 'Exam name and batch are required.' }, { status: 400 });
  }
  if (auth.session.role === 'teacher' && !(await teacherOwnsBatch(auth.session.id, data.batch_id))) {
    return NextResponse.json({ error: 'Not authorized for this batch.' }, { status: 403 });
  }
  const db = getDb();
  const result = await db
    .prepare(
      'INSERT INTO exams (name, batch_id, subject, exam_date, max_marks, created_by) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      data.name,
      data.batch_id,
      data.subject || null,
      data.exam_date || null,
      data.max_marks || 100,
      auth.session.id
    );
  return NextResponse.json({ id: result.lastInsertRowid });
}
