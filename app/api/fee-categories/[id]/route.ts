import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const { id } = await ctx.params;
  const data = await req.json();
  await getDb()
    .prepare('UPDATE fee_categories SET name = @name, amount = @amount WHERE id = @id AND school_id = @school_id')
    .run({ id: Number(id), school_id: auth.session.schoolId, name: data.name, amount: Number(data.amount) || 0 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const { id } = await ctx.params;
  await getDb().prepare('DELETE FROM fee_categories WHERE id = ? AND school_id = ?').run(Number(id), auth.session.schoolId);
  return NextResponse.json({ ok: true });
}
