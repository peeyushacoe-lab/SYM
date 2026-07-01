import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  db.prepare("UPDATE enquiries SET converted=1, status='Joined' WHERE id=?").run(params.id);
  return NextResponse.json({ ok: true });
}
