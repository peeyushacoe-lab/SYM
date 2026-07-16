import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const items = await db
    .prepare(
      `SELECT a.*, r.room_number, r.block, r.monthly_fee, s.name as student_name, s.roll_number
       FROM hostel_allocations a
       JOIN hostel_rooms r ON a.room_id = r.id
       JOIN students s ON a.student_id = s.id
       ORDER BY a.allocated_date DESC, a.id DESC`
    )
    .all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.room_id || !data.student_id) {
    return NextResponse.json({ error: 'room_id and student_id are required.' }, { status: 400 });
  }
  const db = getDb();

  const room = (await db.prepare('SELECT * FROM hostel_rooms WHERE id = ?').get(data.room_id)) as any;
  if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
  if (room.occupied_count >= room.capacity) {
    return NextResponse.json({ error: 'This room is already at full capacity.' }, { status: 400 });
  }

  const existingActive = (await db
    .prepare("SELECT 1 FROM hostel_allocations WHERE student_id = ? AND status = 'Active'")
    .get(data.student_id)) as any;
  if (existingActive) {
    return NextResponse.json({ error: 'This student already has an active room allocation.' }, { status: 400 });
  }

  const allocatedDate = data.allocated_date || new Date().toISOString().slice(0, 10);
  const result = await db
    .prepare(`INSERT INTO hostel_allocations (room_id, student_id, allocated_date, status, remarks) VALUES (?, ?, ?, 'Active', ?)`)
    .run(data.room_id, data.student_id, allocatedDate, data.remarks || null);

  await db.prepare('UPDATE hostel_rooms SET occupied_count = occupied_count + 1 WHERE id = ?').run(data.room_id);

  return NextResponse.json({ id: result.lastInsertRowid });
}
