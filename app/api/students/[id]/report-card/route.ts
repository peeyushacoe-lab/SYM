import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { getStudentProfile, getAttendanceSummary, getResults, getStudentByUserId, guardianOwnsStudent } from '@/lib/portal';
import { buildReportCardPdf } from '@/lib/report-card-pdf';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('management', 'teacher', 'student', 'guardian');
  if ('error' in auth) return auth.error;
  const params = await props.params;

  if (auth.session.role === 'student') {
    const student = await getStudentByUserId(auth.session.id);
    if (!student || String(student.id) !== params.id) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    }
  } else if (auth.session.role === 'guardian' && !(await guardianOwnsStudent(auth.session.id, params.id))) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const student = await getStudentProfile(params.id);
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });

  const [exams, attendance, bands] = await Promise.all([
    getResults(params.id),
    getAttendanceSummary(params.id),
    getDb().prepare('SELECT * FROM grade_bands ORDER BY min_percent DESC').all(),
  ]);

  const pdf = await buildReportCardPdf(student, exams as any, bands as any, attendance.pct);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="report-card-${student.name}.pdf"`,
    },
  });
}
