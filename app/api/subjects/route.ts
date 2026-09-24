import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const items = await getDb().prepare('SELECT * FROM subjects WHERE school_id = ? ORDER BY name').all(auth.session.schoolId);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  const db = getDb();
  const existing = await db.prepare('SELECT id FROM subjects WHERE school_id = ? AND name = ?').get(auth.session.schoolId, data.name);
  if (existing) return NextResponse.json({ error: 'This subject already exists.' }, { status: 400 });
  const result = await db
    .prepare('INSERT INTO subjects (name, school_id) VALUES (?, ?)')
    .run(data.name, auth.session.schoolId);
  return NextResponse.json({ id: result.lastInsertRowid });
}
