import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();

  await db.prepare('UPDATE users SET name=?, mobile=?, email=?, active=? WHERE id=?').run(
    data.name,
    data.mobile || null,
    data.email || null,
    data.active === false ? 0 : 1,
    params.id
  );

  if (data.password) {
    const hash = bcrypt.hashSync(data.password, 10);
    await db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, params.id);
  }

  const user = (await db.prepare('SELECT role FROM users WHERE id=?').get(params.id)) as any;

  if (user?.role === 'teacher' && Array.isArray(data.batch_ids)) {
    await db.prepare('DELETE FROM teacher_batches WHERE teacher_user_id = ?').run(params.id);
    const stmt = db.prepare(
      'INSERT INTO teacher_batches (teacher_user_id, batch_id) VALUES (?, ?) ON CONFLICT (teacher_user_id, batch_id) DO NOTHING'
    );
    for (const bid of data.batch_ids) await stmt.run(params.id, bid);
  }
  if (user?.role === 'guardian' && Array.isArray(data.student_ids)) {
    await db.prepare('DELETE FROM student_guardians WHERE guardian_user_id = ?').run(params.id);
    const stmt = db.prepare(
      'INSERT INTO student_guardians (student_id, guardian_user_id) VALUES (?, ?) ON CONFLICT (student_id, guardian_user_id) DO NOTHING'
    );
    for (const sid of data.student_ids) await stmt.run(sid, params.id);
  }
  if (user?.role === 'student' && data.student_id) {
    await db.prepare('UPDATE students SET user_id = NULL WHERE user_id = ?').run(params.id);
    await db.prepare('UPDATE students SET user_id = ? WHERE id = ?').run(params.id, data.student_id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  await db.prepare('DELETE FROM teacher_batches WHERE teacher_user_id = ?').run(params.id);
  await db.prepare('DELETE FROM student_guardians WHERE guardian_user_id = ?').run(params.id);
  await db.prepare('UPDATE students SET user_id = NULL WHERE user_id = ?').run(params.id);
  await db.prepare('DELETE FROM users WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
