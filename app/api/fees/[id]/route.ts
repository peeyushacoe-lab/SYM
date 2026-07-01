import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const courseFee = Number(data.course_fee) || 0;
  const amountPaid = Number(data.amount_paid) || 0;
  const remainingDue = Math.max(courseFee - amountPaid, 0);
  const db = getDb();
  db.prepare(
    `UPDATE fees SET course_fee=@course_fee, amount_paid=@amount_paid, remaining_due=@remaining_due,
     payment_date=@payment_date, payment_mode=@payment_mode, receipt_number=@receipt_number, remarks=@remarks
     WHERE id=@id`
  ).run({
    id: params.id,
    course_fee: courseFee,
    amount_paid: amountPaid,
    remaining_due: remainingDue,
    payment_date: data.payment_date || null,
    payment_mode: data.payment_mode || 'Cash',
    receipt_number: data.receipt_number || null,
    remarks: data.remarks || null,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  db.prepare('DELETE FROM fees WHERE id=?').run(params.id);
  return NextResponse.json({ ok: true });
}
