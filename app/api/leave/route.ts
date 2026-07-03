import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { getStudentByUserId, guardianOwnsStudent } from '@/lib/portal';

const LIST_SQL = `
  SELECT l.*, s.name as student_name, b.name as batch_name,
         u.name as requested_by_name, r.name as responded_by_name
  FROM leave_requests l
  JOIN students s ON l.student_id = s.id
  LEFT JOIN batches b ON s.batch_id = b.id
  LEFT JOIN users u ON l.requested_by = u.id
  LEFT JOIN users r ON l.responded_by = r.id`;

export async function GET(req: NextRequest) {
  const auth = await requireRole();
  if ('error' in auth) return auth.error;
  const db = getDb();
  const { role, id } = auth.session;
  const studentId = req.nextUrl.searchParams.get('student_id');

  if (role === 'management') {
    const items = db.prepare(`${LIST_SQL} ORDER BY l.created_at DESC`).all();
    return NextResponse.json({ items });
  }
  if (role === 'teacher') {
    const items = db
      .prepare(
        `${LIST_SQL} WHERE s.batch_id IN (SELECT batch_id FROM teacher_batches WHERE teacher_user_id = ?)
         ORDER BY l.created_at DESC`
      )
      .all(id);
    return NextResponse.json({ items });
  }
  if (role === 'student') {
    const student = getStudentByUserId(id);
    if (!student) return NextResponse.json({ items: [] });
    const items = db.prepare(`${LIST_SQL} WHERE l.student_id = ? ORDER BY l.created_at DESC`).all(student.id);
    return NextResponse.json({ items });
  }
  // guardian
  if (studentId) {
    if (!guardianOwnsStudent(id, studentId)) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    }
    const items = db.prepare(`${LIST_SQL} WHERE l.student_id = ? ORDER BY l.created_at DESC`).all(studentId);
    return NextResponse.json({ items });
  }
  const items = db
    .prepare(
      `${LIST_SQL} WHERE l.student_id IN (SELECT student_id FROM student_guardians WHERE guardian_user_id = ?)
       ORDER BY l.created_at DESC`
    )
    .all(id);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('student', 'guardian');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.from_date || !data.to_date || !data.reason) {
    return NextResponse.json({ error: 'From date, to date and reason are required.' }, { status: 400 });
  }

  let studentId: number;
  if (auth.session.role === 'student') {
    const student = getStudentByUserId(auth.session.id);
    if (!student) return NextResponse.json({ error: 'No student profile linked.' }, { status: 404 });
    studentId = student.id;
  } else {
    if (!data.student_id || !guardianOwnsStudent(auth.session.id, data.student_id)) {
      return NextResponse.json({ error: 'Not authorized for this student.' }, { status: 403 });
    }
    studentId = data.student_id;
  }

  const db = getDb();
  const result = db
    .prepare(
      'INSERT INTO leave_requests (student_id, requested_by, from_date, to_date, reason) VALUES (?, ?, ?, ?, ?)'
    )
    .run(studentId, auth.session.id, data.from_date, data.to_date, data.reason);
  return NextResponse.json({ id: result.lastInsertRowid });
}
