import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  await db.prepare('UPDATE visitor_logs SET out_time = ? WHERE id = ?').run(new Date().toISOString(), params.id);
  return NextResponse.json({ ok: true });
}
