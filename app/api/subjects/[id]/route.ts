import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  if (!data.batch_id) return NextResponse.json({ error: 'Select a batch — add a batch first if none exist yet.' }, { status: 400 });

  const db = getDb();
  const batch = await db.prepare('SELECT id FROM batches WHERE id = ? AND school_id = ?').get(data.batch_id, auth.session.schoolId);
  if (!batch) return NextResponse.json({ error: 'Batch not found.' }, { status: 400 });

  const existing = await db
    .prepare('SELECT id FROM subjects WHERE school_id = ? AND batch_id = ? AND name = ? AND id != ?')
    .get(auth.session.schoolId, data.batch_id, data.name, params.id);
  if (existing) return NextResponse.json({ error: 'This subject already exists for that batch.' }, { status: 400 });

  await db
    .prepare('UPDATE subjects SET name = @name, batch_id = @batch_id WHERE id = @id AND school_id = @school_id')
    .run({ id: params.id, school_id: auth.session.schoolId, name: data.name, batch_id: data.batch_id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  await db.prepare('DELETE FROM subjects WHERE id = ? AND school_id = ?').run(params.id, auth.session.schoolId);
  return NextResponse.json({ ok: true });
}
