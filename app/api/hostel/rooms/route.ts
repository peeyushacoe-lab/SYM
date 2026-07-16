import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const items = await db.prepare('SELECT * FROM hostel_rooms ORDER BY block ASC, room_number ASC').all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.room_number) return NextResponse.json({ error: 'Room number is required.' }, { status: 400 });
  const db = getDb();
  const result = await db
    .prepare(
      `INSERT INTO hostel_rooms (room_number, block, room_type, capacity, monthly_fee, remarks)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.room_number,
      data.block || null,
      data.room_type || 'Shared',
      Number(data.capacity) || 1,
      Number(data.monthly_fee) || 0,
      data.remarks || null
    );
  return NextResponse.json({ id: result.lastInsertRowid });
}
