import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const search = req.nextUrl.searchParams.get('search') || '';
  const month = req.nextUrl.searchParams.get('month') || '';
  const db = getDb();
  let query = 'SELECT * FROM expenses WHERE 1=1';
  const params: any[] = [];
  if (search) {
    query += ' AND (category ILIKE ? OR description ILIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (month) {
    query += ' AND expense_date LIKE ?';
    params.push(`${month}%`);
  }
  query += ' ORDER BY expense_date DESC';
  const items = await db.prepare(query).all(...params);
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
  const result = await db
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
