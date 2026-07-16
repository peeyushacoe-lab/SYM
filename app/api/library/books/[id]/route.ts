import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();

  const existing = (await db.prepare('SELECT * FROM library_books WHERE id = ?').get(params.id)) as any;
  if (!existing) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });

  const newTotal = Number(data.total_copies) || existing.total_copies;
  const delta = newTotal - existing.total_copies;
  const newAvailable = Math.max(0, existing.available_copies + delta);

  await db
    .prepare(
      `UPDATE library_books SET title=?, author=?, isbn=?, category=?, total_copies=?, available_copies=? WHERE id=?`
    )
    .run(data.title, data.author || null, data.isbn || null, data.category || null, newTotal, newAvailable, params.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const activeIssues = (await db
    .prepare("SELECT COUNT(*) as c FROM library_issues WHERE book_id = ? AND status = 'Issued'")
    .get(params.id)) as any;
  if (activeIssues?.c > 0) {
    return NextResponse.json({ error: 'Cannot delete a book with copies currently issued.' }, { status: 400 });
  }
  await db.prepare('DELETE FROM library_books WHERE id = ?').run(params.id);
  return NextResponse.json({ ok: true });
}
