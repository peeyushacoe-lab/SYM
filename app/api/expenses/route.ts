import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const search = req.nextUrl.searchParams.get('search') || '';
  const db = getDb();
  const items = search
    ? db
        .prepare('SELECT * FROM expenses WHERE category LIKE ? OR description LIKE ? ORDER BY expense_date DESC')
        .all(`%${search}%`, `%${search}%`)
    : db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC').all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.expense_date || !data.amount) {
    return NextResponse.json({ error: 'Date and amount are required.' }, { status: 400 });
  }
  const db = getDb();
  const result = db
    .prepare(
      'INSERT INTO expenses (expense_date, category, description, amount, payment_mode, remarks) VALUES (@expense_date, @category, @description, @amount, @payment_mode, @remarks)'
    )
    .run({
      expense_date: data.expense_date,
      category: data.category || null,
      description: data.description || null,
      amount: data.amount || 0,
      payment_mode: data.payment_mode || 'Cash',
      remarks: data.remarks || null,
    });
  return NextResponse.json({ id: result.lastInsertRowid });
}
