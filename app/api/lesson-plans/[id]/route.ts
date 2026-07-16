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

  const existing = (await db.prepare('SELECT * FROM lesson_plans WHERE id = ?').get(params.id)) as any;
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (!(await canModify(auth.session.role, auth.session.id, existing.batch_id, db))) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  await db
    .prepare(
      `UPDATE lesson_plans SET subject=?, topic=?, description=?, planned_date=?, status=? WHERE id=?`
    )
    .run(
      data.subject ?? existing.subject, data.topic ?? existing.topic, data.description ?? existing.description,
      data.planned_date ?? existing.planned_date, data.status ?? existing.status, params.id
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();

  const existing = (await db.prepare('SELECT * FROM lesson_plans WHERE id = ?').get(params.id)) as any;
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (!(await canModify(auth.session.role, auth.session.id, existing.batch_id, db))) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  await db.prepare('DELETE FROM lesson_plans WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
