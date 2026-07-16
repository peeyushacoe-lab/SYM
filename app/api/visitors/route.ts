import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const items = await db.prepare('SELECT * FROM visitor_logs ORDER BY in_time DESC, id DESC LIMIT 100').all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.visitor_name) return NextResponse.json({ error: 'Visitor name is required.' }, { status: 400 });
  const db = getDb();
  const inTime = data.in_time || new Date().toISOString();
  const result = await db
    .prepare(
      `INSERT INTO visitor_logs (visitor_name, mobile, purpose, to_meet, in_time, remarks, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(data.visitor_name, data.mobile || null, data.purpose || null, data.to_meet || null, inTime, data.remarks || null, auth.session.id);
  return NextResponse.json({ id: result.lastInsertRowid });
}
