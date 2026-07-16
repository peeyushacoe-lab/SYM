import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { getSessionFromCookies } from '@/lib/auth';

const LIST_SQL = `
  SELECT h.*, b.name as batch_name
  FROM homework h LEFT JOIN batches b ON h.batch_id = b.id`;

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  const db = getDb();
  const batchId = req.nextUrl.searchParams.get('batch_id');

  if (session.role === 'management') {
    const items = batchId
      ? await db.prepare(`${LIST_SQL} WHERE h.batch_id = ? ORDER BY h.due_date DESC, h.created_at DESC`).all(batchId)
      : await db.prepare(`${LIST_SQL} ORDER BY h.due_date DESC, h.created_at DESC`).all();
    return NextResponse.json({ items });
  }

  if (session.role === 'teacher') {
    const items = await db
      .prepare(
        `${LIST_SQL} WHERE h.batch_id IN (SELECT batch_id FROM teacher_batches WHERE teacher_user_id = ?)
         ${batchId ? 'AND h.batch_id = ?' : ''}
         ORDER BY h.due_date DESC, h.created_at DESC`
      )
      .all(...(batchId ? [session.id, batchId] : [session.id]));
    return NextResponse.json({ items });
  }

  if (session.role === 'student') {
    const student = (await db.prepare('SELECT batch_id FROM students WHERE user_id = ?').get(session.id)) as any;
    const items = await db
      .prepare(`${LIST_SQL} WHERE h.batch_id = ? ORDER BY h.due_date DESC, h.created_at DESC`)
      .all(student?.batch_id ?? -1);
    return NextResponse.json({ items });
  }

  if (session.role === 'guardian') {
    const items = await db
      .prepare(
        `${LIST_SQL} WHERE h.batch_id IN (
           SELECT s.batch_id FROM students s JOIN student_guardians sg ON sg.student_id = s.id
           WHERE sg.guardian_user_id = ?
         ) ${batchId ? 'AND h.batch_id = ?' : ''}
         ORDER BY h.due_date DESC, h.created_at DESC`
      )
      .all(...(batchId ? [session.id, batchId] : [session.id]));
    return NextResponse.json({ items });
  }

  return NextResponse.json({ items: [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.batch_id || !data.title) {
    return NextResponse.json({ error: 'batch_id and title are required.' }, { status: 400 });
  }
  const db = getDb();

  if (auth.session.role === 'teacher') {
    const owns = await db
      .prepare('SELECT 1 FROM teacher_batches WHERE teacher_user_id = ? AND batch_id = ?')
      .get(auth.session.id, data.batch_id);
    if (!owns) return NextResponse.json({ error: 'Not authorized for this batch.' }, { status: 403 });
  }

  const result = await db
    .prepare(
      `INSERT INTO homework (batch_id, subject, title, description, due_date, attachment_name, attachment_data_url, created_by)
       VALUES (?,?,?,?,?,?,?,?)`
    )
    .run(
      data.batch_id, data.subject || null, data.title, data.description || null, data.due_date || null,
      data.attachment_name || null, data.attachment_data_url || null, auth.session.id
    );
  return NextResponse.json({ id: result.lastInsertRowid });
}
