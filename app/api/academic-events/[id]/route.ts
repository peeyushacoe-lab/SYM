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
    .prepare(
      `UPDATE academic_events SET title=?, description=?, event_type=?, start_date=?, end_date=?, audience=? WHERE id=?`
    )
    .run(
      data.title,
      data.description || null,
      data.event_type || 'Event',
      data.start_date,
      data.end_date || null,
      data.audience || 'All',
      params.id
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  await db.prepare('DELETE FROM academic_events WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
