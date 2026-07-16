import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const items = await db.prepare('SELECT * FROM branches ORDER BY is_main DESC, name ASC').all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Branch name is required.' }, { status: 400 });
  const db = getDb();

  if (data.is_main) {
    await db.prepare('UPDATE branches SET is_main = 0').run();
  }

  const result = await db
    .prepare(
      `INSERT INTO branches (name, address, contact_mobile, contact_email, is_main, remarks)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(data.name, data.address || null, data.contact_mobile || null, data.contact_email || null, data.is_main ? 1 : 0, data.remarks || null);

  return NextResponse.json({ id: result.lastInsertRowid });
}
