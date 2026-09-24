import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const items = await getDb()
    .prepare('SELECT * FROM student_fee_items WHERE student_id = ? AND active = 1 AND school_id = ? ORDER BY id')
    .all(params.id, auth.session.schoolId);
  return NextResponse.json({ items });
}

// POST { category, fee_type, from_date, amount, partial_supported } -> add fee item
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();
  const student = await db.prepare('SELECT id FROM students WHERE id = ? AND school_id = ?').get(params.id, auth.session.schoolId);
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
  const fromDate = data.from_date || new Date().toISOString().slice(0, 10);

  const result = await db
    .prepare(
      `INSERT INTO student_fee_items (student_id, category, fee_type, from_date, amount, partial_supported, school_id)
       VALUES (@student_id, @category, @fee_type, @from_date, @amount, @partial_supported, @school_id)`
    )
    .run({
      student_id: Number(params.id),
      category: data.category || null,
      fee_type: data.fee_type || 'Monthly',
      from_date: fromDate,
      amount: Number(data.amount) || 0,
      partial_supported: data.partial_supported ? 1 : 0,
      school_id: auth.session.schoolId,
    });
  return NextResponse.json({ id: result.lastInsertRowid });
}

// DELETE ?item=<fee item id> -> deactivate a fee item
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const itemId = req.nextUrl.searchParams.get('item');
  if (!itemId) return NextResponse.json({ error: 'item id required.' }, { status: 400 });
  await getDb()
    .prepare('UPDATE student_fee_items SET active = 0 WHERE id = ? AND student_id = ? AND school_id = ?')
    .run(Number(itemId), Number(params.id), auth.session.schoolId);
  return NextResponse.json({ ok: true });
}
