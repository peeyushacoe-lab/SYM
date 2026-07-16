import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

const LIST_SQL = `
  SELECT lp.*, b.name as batch_name
  FROM lesson_plans lp LEFT JOIN batches b ON lp.batch_id = b.id`;

export async function GET(req: NextRequest) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const batchId = req.nextUrl.searchParams.get('batch_id');

  if (auth.session.role === 'management') {
    const items = batchId
      ? await db.prepare(`${LIST_SQL} WHERE lp.batch_id = ? ORDER BY lp.planned_date DESC, lp.id DESC`).all(batchId)
      : await db.prepare(`${LIST_SQL} ORDER BY lp.planned_date DESC, lp.id DESC`).all();
    return NextResponse.json({ items });
  }

  const items = await db
    .prepare(
      `${LIST_SQL} WHERE lp.batch_id IN (SELECT batch_id FROM teacher_batches WHERE teacher_user_id = ?)
       ${batchId ? 'AND lp.batch_id = ?' : ''}
       ORDER BY lp.planned_date DESC, lp.id DESC`
    )
    .all(...(batchId ? [auth.session.id, batchId] : [auth.session.id]));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.batch_id || !data.subject || !data.topic) {
    return NextResponse.json({ error: 'batch_id, subject and topic are required.' }, { status: 400 });
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
      `INSERT INTO lesson_plans (batch_id, subject, topic, description, planned_date, status, created_by)
       VALUES (?,?,?,?,?,?,?)`
    )
    .run(data.batch_id, data.subject, data.topic, data.description || null, data.planned_date || null, data.status || 'Planned', auth.session.id);
  return NextResponse.json({ id: result.lastInsertRowid });
}
