import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const params = await props.params;
  await getDb().prepare('DELETE FROM timetable_slots WHERE id = ? AND school_id = ?').run(params.id, auth.session.schoolId);
  return NextResponse.json({ ok: true });
}
