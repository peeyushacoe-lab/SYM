import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

// POST { status: 'Active' | 'Closed' } -> toggle student status (Tufee "Close")
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const { status } = await req.json();
  if (!['Active', 'Closed'].includes(status)) {
    return NextResponse.json({ error: 'status must be Active or Closed.' }, { status: 400 });
  }
  await getDb().prepare('UPDATE students SET status = ? WHERE id = ?').run(status, Number(params.id));
  return NextResponse.json({ ok: true });
}
