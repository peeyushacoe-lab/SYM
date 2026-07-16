import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

async function canModify(role: string, userId: number, batchId: number, db: ReturnType<typeof getDb>) {
  if (role === 'management') return true;
  if (role === 'teacher') {
    const owns = await db.prepare('SELECT 1 FROM teacher_batches WHERE teacher_user_id = ? AND batch_id = ?').get(userId, batchId);
    return !!owns;
  }
  return false;
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const data = await req.json();
  const db = getDb();

  const existing = (await db.prepare('SELECT * FROM homework WHERE id = ?').get(params.id)) as any;
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (!(await canModify(auth.session.role, auth.session.id, existing.batch_id, db))) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  await db
    .prepare(
      `UPDATE homework SET batch_id=?, subject=?, title=?, description=?, due_date=?, attachment_name=?, attachment_data_url=?
       WHERE id=?`
    )
    .run(
      data.batch_id ?? existing.batch_id, data.subject ?? existing.subject, data.title ?? existing.title,
      data.description ?? existing.description, data.due_date ?? existing.due_date,
      data.attachment_name ?? existing.attachment_name, data.attachment_data_url ?? existing.attachment_data_url,
      params.id
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();

  const existing = (await db.prepare('SELECT * FROM homework WHERE id = ?').get(params.id)) as any;
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (!(await canModify(auth.session.role, auth.session.id, existing.batch_id, db))) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  await db.prepare('DELETE FROM homework WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
