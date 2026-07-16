import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();

  const existing = (await db.prepare('SELECT * FROM hostel_rooms WHERE id = ?').get(params.id)) as any;
  if (!existing) return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
  const newCapacity = Number(data.capacity) || existing.capacity;
  if (newCapacity < existing.occupied_count) {
    return NextResponse.json({ error: `Capacity cannot be less than ${existing.occupied_count} currently occupied.` }, { status: 400 });
  }

  await db
    .prepare(`UPDATE hostel_rooms SET room_number=?, block=?, room_type=?, capacity=?, monthly_fee=?, remarks=? WHERE id=?`)
    .run(data.room_number, data.block || null, data.room_type || 'Shared', newCapacity, Number(data.monthly_fee) || 0, data.remarks || null, params.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const active = (await db.prepare("SELECT COUNT(*) as c FROM hostel_allocations WHERE room_id = ? AND status = 'Active'").get(params.id)) as any;
  if (active?.c > 0) {
    return NextResponse.json({ error: 'Cannot delete a room with active allocations.' }, { status: 400 });
  }
  await db.prepare('DELETE FROM hostel_rooms WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
