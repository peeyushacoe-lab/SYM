import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const role = req.nextUrl.searchParams.get('role') || '';
  const db = getDb();
  const users = (
    role
      ? db.prepare('SELECT id, username, name, role, mobile, email, active, created_at FROM users WHERE role = ? ORDER BY name').all(role)
      : db.prepare("SELECT id, username, name, role, mobile, email, active, created_at FROM users WHERE role != 'management' ORDER BY role, name").all()
  ) as any[];

  const items = users.map((u) => {
    if (u.role === 'teacher') {
      const batches = db
        .prepare(
          `SELECT b.id, b.name FROM teacher_batches tb JOIN batches b ON tb.batch_id = b.id WHERE tb.teacher_user_id = ?`
        )
        .all(u.id) as any[];
      return { ...u, batches };
    }
    if (u.role === 'guardian') {
      const students = db
        .prepare(
          `SELECT s.id, s.name FROM student_guardians sg JOIN students s ON sg.student_id = s.id WHERE sg.guardian_user_id = ?`
        )
        .all(u.id) as any[];
      return { ...u, students };
    }
    if (u.role === 'student') {
      const student = db.prepare('SELECT id, name FROM students WHERE user_id = ?').get(u.id);
      return { ...u, student };
    }
    return u;
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();

  if (!data.username || !data.password || !data.name || !data.role) {
    return NextResponse.json({ error: 'Username, password, name and role are required.' }, { status: 400 });
  }
  if (!['teacher', 'guardian', 'student'].includes(data.role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(data.username);
  if (existing) {
    return NextResponse.json({ error: 'Username already taken.' }, { status: 400 });
  }

  const hash = bcrypt.hashSync(data.password, 10);
  const result = db
    .prepare('INSERT INTO users (username, password, role, name, mobile, email) VALUES (?, ?, ?, ?, ?, ?)')
    .run(data.username, hash, data.role, data.name, data.mobile || null, data.email || null);
  const userId = result.lastInsertRowid as number;

  if (data.role === 'teacher' && Array.isArray(data.batch_ids)) {
    const stmt = db.prepare('INSERT OR IGNORE INTO teacher_batches (teacher_user_id, batch_id) VALUES (?, ?)');
    for (const bid of data.batch_ids) stmt.run(userId, bid);
  }
  if (data.role === 'guardian' && Array.isArray(data.student_ids)) {
    const stmt = db.prepare('INSERT OR IGNORE INTO student_guardians (student_id, guardian_user_id) VALUES (?, ?)');
    for (const sid of data.student_ids) stmt.run(sid, userId);
  }
  if (data.role === 'student' && data.student_id) {
    db.prepare('UPDATE students SET user_id = ? WHERE id = ?').run(userId, data.student_id);
  }

  return NextResponse.json({ id: userId });
}
