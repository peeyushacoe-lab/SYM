import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();
  db.prepare(
    'UPDATE expenses SET expense_date=@expense_date, category=@category, description=@description, amount=@amount, payment_mode=@payment_mode, remarks=@remarks WHERE id=@id'
  ).run({
    id: params.id,
    expense_date: data.expense_date,
    category: data.category || null,
    description: data.description || null,
    amount: data.amount || 0,
    payment_mode: data.payment_mode || 'Cash',
    remarks: data.remarks || null,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  db.prepare('DELETE FROM expenses WHERE id=?').run(params.id);
  return NextResponse.json({ ok: true });
}
