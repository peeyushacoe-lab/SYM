import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management', 'teacher', 'student', 'guardian');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const items = await db.prepare('SELECT * FROM library_books ORDER BY title ASC').all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  const copies = Number(data.total_copies) || 1;
  const db = getDb();
  const result = await db
    .prepare(
      `INSERT INTO library_books (title, author, isbn, category, total_copies, available_copies)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(data.title, data.author || null, data.isbn || null, data.category || null, copies, copies);
  return NextResponse.json({ id: result.lastInsertRowid });
}
