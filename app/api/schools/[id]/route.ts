import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireOwner } from '@/lib/api-auth';

// Owner-only detail view: a school's name/status plus read-only stats
// (counts, not the actual records — see the isolation model everywhere
// else in this app, which the Owner console deliberately doesn't break).
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();

  const school = await db.prepare('SELECT * FROM schools WHERE id = ?').get(params.id);
  if (!school) return NextResponse.json({ error: 'School not found.' }, { status: 404 });

  // Sequential rather than Promise.all — these are a handful of cheap COUNT
  // queries on an Owner-only, low-traffic page, not worth spending a second
  // pooled connection on.
  const studentCount = await db.prepare('SELECT COUNT(*) as c FROM students WHERE school_id = ?').get(params.id);
  const staffCount = await db.prepare('SELECT COUNT(*) as c FROM staff WHERE school_id = ?').get(params.id);
  const batchCount = await db.prepare('SELECT COUNT(*) as c FROM batches WHERE school_id = ?').get(params.id);
  const courseCount = await db.prepare('SELECT COUNT(*) as c FROM courses WHERE school_id = ?').get(params.id);
  const subjectCount = await db.prepare('SELECT COUNT(*) as c FROM subjects WHERE school_id = ?').get(params.id);
  const teacherCount = await db.prepare("SELECT COUNT(*) as c FROM users WHERE school_id = ? AND role = 'teacher'").get(params.id);
  const examCount = await db.prepare('SELECT COUNT(*) as c FROM exams WHERE school_id = ?').get(params.id);
  const admins = await db
    .prepare(
      "SELECT id, username, name, email, mobile, active, created_at FROM users WHERE school_id = ? AND role = 'management' ORDER BY created_at"
    )
    .all(params.id);
  const feeThisMonth = await db
    .prepare('SELECT COALESCE(SUM(amount_paid), 0) as total FROM fees WHERE school_id = ? AND payment_date LIKE ?')
    .get(params.id, `${new Date().toISOString().slice(0, 7)}%`);
  const dueTotal = await db
    .prepare('SELECT COALESCE(SUM(remaining_due), 0) as total FROM fees WHERE school_id = ? AND remaining_due > 0')
    .get(params.id);

  return NextResponse.json({
    school,
    stats: {
      students: (studentCount as any)?.c || 0,
      staff: (staffCount as any)?.c || 0,
      batches: (batchCount as any)?.c || 0,
      courses: (courseCount as any)?.c || 0,
      subjects: (subjectCount as any)?.c || 0,
      teachers: (teacherCount as any)?.c || 0,
      exams: (examCount as any)?.c || 0,
      feeCollectedThisMonth: (feeThisMonth as any)?.total || 0,
      totalDue: (dueTotal as any)?.total || 0,
    },
    admins,
  });
}

// Owner-only: rename a school and/or flip its active flag. Deactivating a
// school does NOT log its admins/staff out immediately (sessions are JWTs,
// not server-checked per request) — it's a soft "suspend new logins" flag
// for now, not an instant kill switch.
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const data = await req.json();
  const db = getDb();

  const existing = await db.prepare('SELECT * FROM schools WHERE id = ?').get(params.id);
  if (!existing) return NextResponse.json({ error: 'School not found.' }, { status: 404 });

  await db
    .prepare('UPDATE schools SET name = @name, active = @active WHERE id = @id')
    .run({
      id: params.id,
      name: data.name ?? (existing as any).name,
      active: data.active !== undefined ? (data.active ? 1 : 0) : (existing as any).active,
    });
  return NextResponse.json({ ok: true });
}

// Owner-only: permanently delete a school and every row of data it owns.
// Order matters — tables without ON DELETE CASCADE back to
// students/batches/users/exams must be cleared first, or Postgres throws a
// foreign-key-violation. Tables that DO cascade (student_fee_items,
// student_documents, library_issues, hostel_allocations,
// transport_assignments, payroll_runs, staff_attendance) are left alone;
// deleting their parent row below removes them automatically.
const PRE_DELETE_ORDER = [
  'exam_marks', 'attendance', 'teacher_batches', 'student_guardians', 'timetable_slots',
  'leave_requests', 'homework', 'lesson_plans', 'queries', 'fees', 'payments',
];
const MID_DELETE_ORDER = ['exams', 'students', 'staff', 'batches', 'users'];
const REMAINING_ORDER = [
  'courses', 'enquiries', 'expenses', 'notices', 'branches', 'fee_categories', 'sms_templates',
  'role_permissions', 'academic_events', 'library_books', 'inventory_items', 'hostel_rooms',
  'transport_vehicles', 'alumni', 'visitor_logs', 'grade_bands', 'subjects',
];

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();

  const existing = await db.prepare('SELECT id, name FROM schools WHERE id = ?').get(params.id);
  if (!existing) return NextResponse.json({ error: 'School not found.' }, { status: 404 });

  const doDelete = db.transaction(async () => {
    for (const table of [...PRE_DELETE_ORDER, ...MID_DELETE_ORDER, ...REMAINING_ORDER]) {
      await db.prepare(`DELETE FROM ${table} WHERE school_id = ?`).run(params.id);
    }
    await db.prepare('DELETE FROM schools WHERE id = ?').run(params.id);
  });

  try {
    await doDelete();
  } catch (e: any) {
    return NextResponse.json({ error: `Could not delete school: ${e.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: (existing as any).name });
}
