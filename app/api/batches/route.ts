import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const search = req.nextUrl.searchParams.get('search') || '';
  const db = getDb();
  const items = search
    ? await db
        .prepare(
          `SELECT b.*, COUNT(s.id) as student_count FROM batches b
           LEFT JOIN students s ON s.batch_id = b.id
           WHERE b.name ILIKE ? OR b.course ILIKE ?
           GROUP BY b.id ORDER BY b.name`
        )
        .all(`%${search}%`, `%${search}%`)
    : await db
        .prepare(
          `SELECT b.*, COUNT(s.id) as student_count FROM batches b
           LEFT JOIN students s ON s.batch_id = b.id
           GROUP BY b.id ORDER BY b.name`
        )
        .all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Batch name is required.' }, { status: 400 });
  const db = getDb();
  const result = await db
    .prepare(
      'INSERT INTO batches (name, course, start_date, end_date, timing, capacity, remarks, advance_fee) VALUES (@name, @course, @start_date, @end_date, @timing, @capacity, @remarks, @advance_fee)'
    )
    .run({
      name: data.name,
      course: data.course || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      timing: data.timing || null,
      capacity: data.capacity || 30,
      remarks: data.remarks || null,
      advance_fee: Number(data.advance_fee) ? 1 : 0,
    });
  return NextResponse.json({ id: result.lastInsertRowid });
}
