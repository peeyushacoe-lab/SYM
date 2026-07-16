import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();
  // Quantity is only changed via stock transactions, not a direct edit, to keep the log accurate.
  await db
    .prepare(
      `UPDATE inventory_items SET name=?, category=?, unit=?, unit_cost=?, reorder_level=?, location=?, remarks=? WHERE id=?`
    )
    .run(
      data.name,
      data.category || null,
      data.unit || 'pcs',
      Number(data.unit_cost) || 0,
      Number(data.reorder_level) || 0,
      data.location || null,
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
  await db.prepare('DELETE FROM inventory_items WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
