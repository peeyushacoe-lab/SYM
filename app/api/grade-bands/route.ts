import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { getSessionFromCookies } from '@/lib/auth';

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  const db = getDb();
  const items = await db.prepare('SELECT * FROM grade_bands ORDER BY min_percent DESC').all();
  return NextResponse.json({ items });
}

// Replaces the entire grade band table with the given set (management only).
export async function PUT(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!Array.isArray(data.bands)) {
    return NextResponse.json({ error: 'bands array is required.' }, { status: 400 });
  }
  const db = getDb();
  await db.exec('DELETE FROM grade_bands');
  for (const b of data.bands) {
    await db
      .prepare('INSERT INTO grade_bands (grade, min_percent, max_percent, remarks) VALUES (?,?,?,?)')
      .run(b.grade, b.min_percent, b.max_percent, b.remarks || null);
  }
  return NextResponse.json({ ok: true });
}
