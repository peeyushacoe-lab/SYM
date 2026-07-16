import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const items = await db
    .prepare(
      `SELECT v.*, (SELECT COUNT(*) FROM transport_assignments a WHERE a.vehicle_id = v.id AND a.status = 'Active') as assigned_count
       FROM transport_vehicles v ORDER BY vehicle_number ASC`
    )
    .all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.vehicle_number) return NextResponse.json({ error: 'Vehicle number is required.' }, { status: 400 });
  const db = getDb();
  const result = await db
    .prepare(
      `INSERT INTO transport_vehicles (vehicle_number, driver_name, driver_mobile, capacity, route_name, remarks)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(data.vehicle_number, data.driver_name || null, data.driver_mobile || null, Number(data.capacity) || 1, data.route_name || null, data.remarks || null);
  return NextResponse.json({ id: result.lastInsertRowid });
}
