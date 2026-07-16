import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();

  const allocation = (await db.prepare('SELECT * FROM hostel_allocations WHERE id = ?').get(params.id)) as any;
  if (!allocation) return NextResponse.json({ error: 'Allocation not found.' }, { status: 404 });
  if (allocation.status === 'Vacated') {
    return NextResponse.json({ error: 'This allocation has already been vacated.' }, { status: 400 });
  }

  const vacatedDate = new Date().toISOString().slice(0, 10);
  await db.prepare(`UPDATE hostel_allocations SET status='Vacated', vacated_date=? WHERE id=?`).run(vacatedDate, params.id);
  await db.prepare('UPDATE hostel_rooms SET occupied_count = GREATEST(occupied_count - 1, 0) WHERE id = ?').run(allocation.room_id);

  return NextResponse.json({ ok: true });
}
