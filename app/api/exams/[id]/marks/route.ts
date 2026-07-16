import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { teacherOwnsBatch } from '@/lib/portal';

// Bulk upsert marks: { records: [{ student_id, marks, remarks }] }
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const exam = (await db.prepare('SELECT * FROM exams WHERE id = ?').get(params.id)) as any;
  if (!exam) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
  if (auth.session.role === 'teacher' && !(await teacherOwnsBatch(auth.session.id, exam.batch_id))) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const { records } = await req.json();
  if (!Array.isArray(records)) {
    return NextResponse.json({ error: 'records array is required.' }, { status: 400 });
  }

  const upsert = db.prepare(
    `INSERT INTO exam_marks (exam_id, student_id, marks, remarks) VALUES (?, ?, ?, ?)
     ON CONFLICT(exam_id, student_id) DO UPDATE SET marks = excluded.marks, remarks = excluded.remarks`
  );
  const clear = db.prepare('DELETE FROM exam_marks WHERE exam_id = ? AND student_id = ?');

  const tx = db.transaction(async (rows: any[]) => {
    for (const r of rows) {
      if (!r.student_id) continue;
      if (r.marks === null || r.marks === undefined || r.marks === '') {
        await clear.run(params.id, r.student_id);
      } else {
        await upsert.run(params.id, r.student_id, Number(r.marks), r.remarks || null);
      }
    }
  });
  await tx(records);

  return NextResponse.json({ ok: true });
}
