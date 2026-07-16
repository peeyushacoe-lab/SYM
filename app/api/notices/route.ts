import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { getSessionFromCookies } from '@/lib/auth';

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  const db = getDb();

  if (session.role === 'management') {
    const items = await db.prepare('SELECT * FROM notices ORDER BY created_at DESC').all();
    return NextResponse.json({ items });
  }

  if (session.role === 'teacher') {
    const items = await db
      .prepare("SELECT * FROM notices WHERE audience IN ('All','Teachers') ORDER BY created_at DESC LIMIT 30")
      .all();
    return NextResponse.json({ items });
  }

  if (session.role === 'student') {
    const student = (await db.prepare('SELECT batch_id FROM students WHERE user_id = ?').get(session.id)) as any;
    const items = await db
      .prepare(
        `SELECT * FROM notices WHERE audience IN ('All','Students') OR (audience='Batch' AND batch_id = ?)
         ORDER BY created_at DESC LIMIT 30`
      )
      .all(student?.batch_id ?? -1);
    return NextResponse.json({ items });
  }

  if (session.role === 'guardian') {
    const items = await db
      .prepare("SELECT * FROM notices WHERE audience IN ('All','Guardians') ORDER BY created_at DESC LIMIT 30")
      .all();
    return NextResponse.json({ items });
  }

  return NextResponse.json({ items: [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  const db = getDb();
  const result = await db
    .prepare('INSERT INTO notices (title, body, audience, batch_id, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(data.title, data.body || null, data.audience || 'All', data.batch_id || null, auth.session.id);
  return NextResponse.json({ id: result.lastInsertRowid });
}
