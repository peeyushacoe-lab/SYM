import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Branch name is required.' }, { status: 400 });
  const db = getDb();

  if (data.is_main) {
    await db.prepare('UPDATE branches SET is_main = 0 WHERE id != ?').run(params.id);
  }

  await db
    .prepare('UPDATE branches SET name=?, address=?, contact_mobile=?, contact_email=?, is_main=?, remarks=? WHERE id=?')
    .run(data.name, data.address || null, data.contact_mobile || null, data.contact_email || null, data.is_main ? 1 : 0, data.remarks || null, params.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const branch = (await db.prepare('SELECT * FROM branches WHERE id = ?').get(params.id)) as any;
  if (!branch) return NextResponse.json({ error: 'Branch not found.' }, { status: 404 });
  if (branch.is_main) return NextResponse.json({ error: 'Cannot delete the main branch.' }, { status: 400 });
  await db.prepare('DELETE FROM branches WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
