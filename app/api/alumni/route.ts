import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const search = req.nextUrl.searchParams.get('search') || '';
  const db = getDb();
  const items = search
    ? await db
        .prepare(
          'SELECT * FROM alumni WHERE name LIKE ? OR course LIKE ? OR current_organization LIKE ? ORDER BY graduation_year DESC, name'
        )
        .all(`%${search}%`, `%${search}%`, `%${search}%`)
    : await db.prepare('SELECT * FROM alumni ORDER BY graduation_year DESC, name').all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  const db = getDb();
  const result = await db
    .prepare(
      `INSERT INTO alumni (student_id, name, course, graduation_year, mobile, email, current_occupation, current_organization, address, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.student_id || null,
      data.name,
      data.course || null,
      data.graduation_year || null,
      data.mobile || null,
      data.email || null,
      data.current_occupation || null,
      data.current_organization || null,
      data.address || null,
      data.remarks || null
    );
  return NextResponse.json({ id: result.lastInsertRowid });
}
