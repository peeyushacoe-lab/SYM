import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { getSessionFromCookies } from '@/lib/auth';

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  const db = getDb();

  if (session.role === 'management') {
    const items = await db.prepare('SELECT * FROM academic_events ORDER BY start_date ASC').all();
    return NextResponse.json({ items });
  }

  if (session.role === 'teacher') {
    const items = await db
      .prepare("SELECT * FROM academic_events WHERE audience IN ('All','Teachers') ORDER BY start_date ASC")
      .all();
    return NextResponse.json({ items });
  }

  if (session.role === 'student') {
    const items = await db
      .prepare("SELECT * FROM academic_events WHERE audience IN ('All','Students') ORDER BY start_date ASC")
      .all();
    return NextResponse.json({ items });
  }

  if (session.role === 'guardian') {
    const items = await db
      .prepare("SELECT * FROM academic_events WHERE audience IN ('All','Guardians') ORDER BY start_date ASC")
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
  if (!data.start_date) return NextResponse.json({ error: 'Start date is required.' }, { status: 400 });
  const db = getDb();
  const result = await db
    .prepare(
      `INSERT INTO academic_events (title, description, event_type, start_date, end_date, audience, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.title,
      data.description || null,
      data.event_type || 'Event',
      data.start_date,
      data.end_date || null,
      data.audience || 'All',
      auth.session.id
    );
  return NextResponse.json({ id: result.lastInsertRowid });
}
