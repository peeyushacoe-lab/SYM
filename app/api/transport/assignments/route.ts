import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const items = await db
    .prepare(
      `SELECT a.*, v.vehicle_number, v.route_name, s.name as student_name, s.roll_number
       FROM transport_assignments a
       JOIN transport_vehicles v ON a.vehicle_id = v.id
       JOIN students s ON a.student_id = s.id
       ORDER BY a.assigned_date DESC, a.id DESC`
    )
    .all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.vehicle_id || !data.student_id) {
    return NextResponse.json({ error: 'vehicle_id and student_id are required.' }, { status: 400 });
  }
  const db = getDb();

  const vehicle = (await db.prepare('SELECT * FROM transport_vehicles WHERE id = ?').get(data.vehicle_id)) as any;
  if (!vehicle) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 });

  const activeCount = (await db
    .prepare("SELECT COUNT(*) as c FROM transport_assignments WHERE vehicle_id = ? AND status = 'Active'")
    .get(data.vehicle_id)) as any;
  if (activeCount?.c >= vehicle.capacity) {
    return NextResponse.json({ error: 'This vehicle is already at full capacity.' }, { status: 400 });
  }

  const existingActive = (await db
    .prepare("SELECT 1 FROM transport_assignments WHERE student_id = ? AND status = 'Active'")
    .get(data.student_id)) as any;
  if (existingActive) {
    return NextResponse.json({ error: 'This student already has an active transport assignment.' }, { status: 400 });
  }

  const assignedDate = data.assigned_date || new Date().toISOString().slice(0, 10);
  const result = await db
    .prepare(
      `INSERT INTO transport_assignments (vehicle_id, student_id, pickup_point, monthly_fee, status, assigned_date)
       VALUES (?, ?, ?, ?, 'Active', ?)`
    )
    .run(data.vehicle_id, data.student_id, data.pickup_point || null, Number(data.monthly_fee) || 0, assignedDate);

  return NextResponse.json({ id: result.lastInsertRowid });
}
