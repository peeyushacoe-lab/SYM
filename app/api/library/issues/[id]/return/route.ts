import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

const FINE_PER_DAY = 2;

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();

  const issue = (await db.prepare('SELECT * FROM library_issues WHERE id = ?').get(params.id)) as any;
  if (!issue) return NextResponse.json({ error: 'Issue record not found.' }, { status: 404 });
  if (issue.status === 'Returned') {
    return NextResponse.json({ error: 'This book has already been returned.' }, { status: 400 });
  }

  const returnedDate = new Date().toISOString().slice(0, 10);
  const dueMs = new Date(issue.due_date).getTime();
  const returnedMs = new Date(returnedDate).getTime();
  const overdueDays = Math.max(0, Math.round((returnedMs - dueMs) / (1000 * 60 * 60 * 24)));
  const fine = overdueDays * FINE_PER_DAY;

  await db
    .prepare(`UPDATE library_issues SET status='Returned', returned_date=?, fine_amount=? WHERE id=?`)
    .run(returnedDate, fine, params.id);

  await db.prepare('UPDATE library_books SET available_copies = available_copies + 1 WHERE id = ?').run(issue.book_id);

  return NextResponse.json({ ok: true, fine, overdueDays });
}
