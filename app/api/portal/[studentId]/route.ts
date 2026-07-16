import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import {
  getStudentByUserId,
  guardianOwnsStudent,
  getStudentProfile,
  getAttendanceSummary,
  getAttendanceMonth,
  getResults,
  getTimetable,
  getFees,
} from '@/lib/portal';

// Unified read endpoint for student & guardian portals.
// GET /api/portal/{studentId}?section=profile|attendance|results|timetable|fees|summary
// - students may only access their own record (studentId can be "me")
// - guardians may only access linked children
export async function GET(req: NextRequest, props: { params: Promise<{ studentId: string }> }) {
  const auth = await requireRole('student', 'guardian');
  if ('error' in auth) return auth.error;
  const params = await props.params;

  let studentId: number;
  if (auth.session.role === 'student') {
    const student = await getStudentByUserId(auth.session.id);
    if (!student) {
      return NextResponse.json({ error: 'No student profile is linked to this account yet.' }, { status: 404 });
    }
    if (params.studentId !== 'me' && Number(params.studentId) !== student.id) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    }
    studentId = student.id;
  } else {
    if (params.studentId === 'me' || !(await guardianOwnsStudent(auth.session.id, params.studentId))) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    }
    studentId = Number(params.studentId);
  }

  const section = req.nextUrl.searchParams.get('section') || 'summary';
  const profile = await getStudentProfile(studentId);
  if (!profile) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });

  switch (section) {
    case 'profile':
      return NextResponse.json({ student: profile });
    case 'attendance': {
      const month = req.nextUrl.searchParams.get('month') || new Date().toISOString().slice(0, 7);
      const [days, summary] = await Promise.all([getAttendanceMonth(studentId, month), getAttendanceSummary(studentId)]);
      return NextResponse.json({ student: profile, month, days, summary });
    }
    case 'results':
      return NextResponse.json({ student: profile, results: await getResults(studentId) });
    case 'timetable':
      return NextResponse.json({ student: profile, slots: await getTimetable(profile.batch_id) });
    case 'fees': {
      const { fees, payments } = await getFees(studentId);
      return NextResponse.json({ student: profile, fees, payments });
    }
    default: {
      // summary: everything the overview dashboard needs
      const [{ fees }, results, summary, slots] = await Promise.all([
        getFees(studentId),
        getResults(studentId),
        getAttendanceSummary(studentId),
        getTimetable(profile.batch_id),
      ]);
      const totalDue = fees.reduce((s: number, f: any) => s + (f.remaining_due || 0), 0);
      return NextResponse.json({
        student: profile,
        attendance: summary,
        totalDue,
        feeCount: fees.length,
        latestResults: results.slice(0, 3),
        todaySlots: slots.filter((s: any) => s.day === (new Date().getDay() + 6) % 7),
      });
    }
  }
}
