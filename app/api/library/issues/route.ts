import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { getStudentByUserId } from '@/lib/portal';

const FINE_PER_DAY = 2;

export async function GET() {
  const auth = await requireRole('management', 'teacher', 'student', 'guardian');
  if ('error' in auth) return auth.error;
  const db = getDb();

  const baseSelect = `
    SELECT li.*, b.title as book_title, b.author as book_author, s.name as student_name, s.roll_number,
      CASE WHEN li.status = 'Issued' AND li.due_date < CURRENT_DATE::TEXT THEN true ELSE false END as is_overdue
    FROM library_issues li
    JOIN library_books b ON li.book_id = b.id
    JOIN students s ON li.student_id = s.id
  `;

  if (auth.session.role === 'management' || auth.session.role === 'teacher') {
    const items = await db.prepare(`${baseSelect} ORDER BY li.issued_date DESC, li.id DESC`).all();
    return NextResponse.json({ items });
  }

  if (auth.session.role === 'student') {
    const student = await getStudentByUserId(auth.session.id);
    if (!student) return NextResponse.json({ items: [] });
    const items = await db
      .prepare(`${baseSelect} WHERE li.student_id = ? ORDER BY li.issued_date DESC, li.id DESC`)
      .all(student.id);
    return NextResponse.json({ items });
  }

  if (auth.session.role === 'guardian') {
    const items = await db
      .prepare(
        `${baseSelect}
         WHERE li.student_id IN (SELECT student_id FROM student_guardians WHERE guardian_user_id = ?)
         ORDER BY li.issued_date DESC, li.id DESC`
      )
      .all(auth.session.id);
    return NextResponse.json({ items });
  }

  return NextResponse.json({ items: [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.book_id || !data.student_id || !data.due_date) {
    return NextResponse.json({ error: 'book_id, student_id and due_date are required.' }, { status: 400 });
  }
  const db = getDb();

  const book = (await db.prepare('SELECT * FROM library_books WHERE id = ?').get(data.book_id)) as any;
  if (!book) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
  if (book.available_copies <= 0) {
    return NextResponse.json({ error: 'No copies available to issue.' }, { status: 400 });
  }

  const issuedDate = data.issued_date || new Date().toISOString().slice(0, 10);
  const result = await db
    .prepare(
      `INSERT INTO library_issues (book_id, student_id, issued_date, due_date, status, issued_by)
       VALUES (?, ?, ?, ?, 'Issued', ?)`
    )
    .run(data.book_id, data.student_id, issuedDate, data.due_date, auth.session.id);

  await db.prepare('UPDATE library_books SET available_copies = available_copies - 1 WHERE id = ?').run(data.book_id);

  return NextResponse.json({ id: result.lastInsertRowid, finePerDay: FINE_PER_DAY });
}
