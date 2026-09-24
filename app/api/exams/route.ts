import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { teacherOwnsBatch } from '@/lib/portal';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const batchId = req.nextUrl.searchParams.get('batch_id');

  // A batch-based exam's students are whoever is in that batch; a
  // course-based exam (for students who enrolled via a course rather than a
  // batch, see students.course) targets everyone with that course text
  // instead. An exam always has at least one of batch_id/course set.
  let sql = `SELECT e.*, b.name as batch_name,
      (SELECT COUNT(*) FROM exam_marks m WHERE m.exam_id = e.id) as marks_entered,
      (SELECT COUNT(*) FROM students s WHERE
         (e.batch_id IS NOT NULL AND s.batch_id = e.batch_id)
         OR (e.batch_id IS NULL AND e.course IS NOT NULL AND s.course = e.course AND s.school_id = e.school_id)
      ) as student_count
    FROM exams e LEFT JOIN batches b ON e.batch_id = b.id`;
  const where: string[] = ['e.school_id = ?'];
  const params: any[] = [auth.session.schoolId];

  if (auth.session.role === 'teacher') {
    where.push('e.batch_id IN (SELECT batch_id FROM teacher_batches WHERE teacher_user_id = ?)');
    params.push(auth.session.id);
  }
  if (batchId) {
    where.push('e.batch_id = ?');
    params.push(batchId);
  }
  sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY e.exam_date DESC, e.id DESC';

  const items = await db.prepare(sql).all(...params);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name || (!data.batch_id && !data.course)) {
    return NextResponse.json({ error: 'Exam name and either a batch or a course are required.' }, { status: 400 });
  }
  if (data.batch_id && auth.session.role === 'teacher' && !(await teacherOwnsBatch(auth.session.id, data.batch_id))) {
    return NextResponse.json({ error: 'Not authorized for this batch.' }, { status: 403 });
  }
  // Course-based exams are course-admin work, not a specific teacher's batch
  // — teachers can only create batch exams for batches they own.
  if (!data.batch_id && data.course && auth.session.role === 'teacher') {
    return NextResponse.json({ error: 'Only management can create course-based exams.' }, { status: 403 });
  }
  const db = getDb();
  const result = await db
    .prepare(
      'INSERT INTO exams (name, batch_id, course, subject, exam_date, max_marks, created_by, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      data.name,
      data.batch_id || null,
      data.batch_id ? null : data.course || null,
      data.subject || null,
      data.exam_date || null,
      data.max_marks || 100,
      auth.session.id,
      auth.session.schoolId
    );
  return NextResponse.json({ id: result.lastInsertRowid });
}
