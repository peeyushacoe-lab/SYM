import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { getStudentByUserId, guardianOwnsStudent } from '@/lib/portal';

const LIST_SQL = `
  SELECT q.*, s.name as student_name, u.name as raised_by_name, u.role as raised_by_role,
         r.name as responded_by_name
  FROM queries q
  LEFT JOIN students s ON q.student_id = s.id
  LEFT JOIN users u ON q.raised_by = u.id
  LEFT JOIN users r ON q.responded_by = r.id`;

export async function GET(req: NextRequest) {
  const auth = await requireRole();
  if ('error' in auth) return auth.error;
  const db = getDb();
  const { role, id } = auth.session;
  const studentId = req.nextUrl.searchParams.get('student_id');

  if (role === 'management') {
    const items = await db.prepare(`${LIST_SQL} ORDER BY q.created_at DESC`).all();
    return NextResponse.json({ items });
  }
  if (role === 'guardian' && studentId) {
    if (!(await guardianOwnsStudent(id, studentId))) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    }
    const items = await db
      .prepare(`${LIST_SQL} WHERE q.raised_by = ? AND q.student_id = ? ORDER BY q.created_at DESC`)
      .all(id, studentId);
    return NextResponse.json({ items });
  }
  const items = await db.prepare(`${LIST_SQL} WHERE q.raised_by = ? ORDER BY q.created_at DESC`).all(id);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('student', 'guardian', 'teacher');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.subject) return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });

  let studentId: number | null = null;
  if (auth.session.role === 'student') {
    const student = await getStudentByUserId(auth.session.id);
    studentId = student?.id ?? null;
  } else if (auth.session.role === 'guardian' && data.student_id) {
    if (!(await guardianOwnsStudent(auth.session.id, data.student_id))) {
      return NextResponse.json({ error: 'Not authorized for this student.' }, { status: 403 });
    }
    studentId = data.student_id;
  }

  const db = getDb();
  const result = await db
    .prepare('INSERT INTO queries (student_id, raised_by, subject, message) VALUES (?, ?, ?, ?)')
    .run(studentId, auth.session.id, data.subject, data.message || null);
  return NextResponse.json({ id: result.lastInsertRowid });
}
