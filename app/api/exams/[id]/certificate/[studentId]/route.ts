import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { teacherOwnsBatch } from '@/lib/portal';
import { buildCertificatePdf } from '@/lib/certificate-pdf';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string; studentId: string }> }) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();

  const exam = (await db
    .prepare('SELECT * FROM exams WHERE id = ? AND school_id = ?')
    .get(params.id, auth.session.schoolId)) as any;
  if (!exam) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
  if (exam.batch_id && auth.session.role === 'teacher' && !(await teacherOwnsBatch(auth.session.id, exam.batch_id))) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const mark = (await db
    .prepare('SELECT marks FROM exam_marks WHERE exam_id = ? AND student_id = ?')
    .get(params.id, params.studentId)) as any;
  if (!mark || mark.marks === null || mark.marks === undefined) {
    return NextResponse.json({ error: 'No marks entered for this student yet.' }, { status: 400 });
  }

  const student = (await db
    .prepare(
      `SELECT s.name, s.roll_number, s.course, b.name as batch_name
       FROM students s LEFT JOIN batches b ON s.batch_id = b.id
       WHERE s.id = ? AND s.school_id = ?`
    )
    .get(params.studentId, auth.session.schoolId)) as any;
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });

  const bands = (await db.prepare('SELECT * FROM grade_bands WHERE school_id = ? ORDER BY min_percent DESC').all(auth.session.schoolId)) as any;

  const pdf = await buildCertificatePdf(student, exam, Number(mark.marks), bands);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="certificate-${student.name}-${exam.name}.pdf"`,
    },
  });
}
