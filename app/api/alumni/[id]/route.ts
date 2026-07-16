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
    .prepare(
      `UPDATE alumni SET name=?, course=?, graduation_year=?, mobile=?, email=?, current_occupation=?, current_organization=?, address=?, remarks=? WHERE id=?`
    )
    .run(
      data.name,
      data.course || null,
      data.graduation_year || null,
      data.mobile || null,
      data.email || null,
      data.current_occupation || null,
      data.current_organization || null,
      data.address || null,
      data.remarks || null,
      params.id
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  await db.prepare('DELETE FROM alumni WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
