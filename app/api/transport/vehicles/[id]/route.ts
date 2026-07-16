import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();
  await db
    .prepare(`UPDATE transport_vehicles SET vehicle_number=?, driver_name=?, driver_mobile=?, capacity=?, route_name=?, remarks=? WHERE id=?`)
    .run(data.vehicle_number, data.driver_name || null, data.driver_mobile || null, Number(data.capacity) || 1, data.route_name || null, data.remarks || null, params.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const active = (await db.prepare("SELECT COUNT(*) as c FROM transport_assignments WHERE vehicle_id = ? AND status = 'Active'").get(params.id)) as any;
  if (active?.c > 0) {
    return NextResponse.json({ error: 'Cannot delete a vehicle with active student assignments.' }, { status: 400 });
  }
  await db.prepare('DELETE FROM transport_vehicles WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
