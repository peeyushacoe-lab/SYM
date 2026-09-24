import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  const db = getDb();
  await db
    .prepare('UPDATE subjects SET name = @name WHERE id = @id AND school_id = @school_id')
    .run({ id: params.id, school_id: auth.session.schoolId, name: data.name });
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
