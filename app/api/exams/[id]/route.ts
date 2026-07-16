import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { teacherOwnsBatch } from '@/lib/portal';

async function authorize(id: string) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth;
  const db = getDb();
  const exam = (await db
    .prepare('SELECT e.*, b.name as batch_name FROM exams e LEFT JOIN batches b ON e.batch_id = b.id WHERE e.id = ?')
    .get(id)) as any;
  if (!exam) return { error: NextResponse.json({ error: 'Exam not found.' }, { status: 404 }) };
  if (auth.session.role === 'teacher' && !(await teacherOwnsBatch(auth.session.id, exam.batch_id))) {
    return { error: NextResponse.json({ error: 'Not authorized.' }, { status: 403 }) };
  }
  return { session: auth.session, exam, db };
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const result = await authorize(params.id);
  if ('error' in result) return result.error;
  const { exam, db } = result;
  const students = await db
    .prepare(
      `SELECT s.id, s.name, s.roll_number, m.marks, m.remarks
       FROM students s
       LEFT JOIN exam_marks m ON m.student_id = s.id AND m.exam_id = ?
       WHERE s.batch_id = ?
       ORDER BY NULLIF(regexp_replace(s.roll_number, '[^0-9]', '', 'g'), '')::int NULLS LAST, s.name`
    )
    .all(exam.id, exam.batch_id);
  return NextResponse.json({ exam, students });
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const result = await authorize(params.id);
  if ('error' in result) return result.error;
  const data = await req.json();
  await result.db
    .prepare('UPDATE exams SET name = ?, subject = ?, exam_date = ?, max_marks = ? WHERE id = ?')
    .run(
      data.name ?? result.exam.name,
      data.subject ?? result.exam.subject,
      data.exam_date ?? result.exam.exam_date,
      data.max_marks ?? result.exam.max_marks,
      params.id
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const result = await authorize(params.id);
  if ('error' in result) return result.error;
  await result.db.prepare('DELETE FROM exam_marks WHERE exam_id = ?').run(params.id);
  await result.db.prepare('DELETE FROM exams WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
