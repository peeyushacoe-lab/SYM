import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

function addMonths(dateStr: string, months: number): Date {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d;
}
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function lastDayOfPeriod(from: Date, months: number) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() - 1);
  return d;
}

const PERIOD_MONTHS: Record<string, number> = { Monthly: 1, Quarterly: 3 };

// GET -> next suggested collection (period auto-advance + next receipt no)
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const studentId = Number(params.id);

  const item = (await db
    .prepare('SELECT * FROM student_fee_items WHERE student_id = ? AND active = 1 ORDER BY id LIMIT 1')
    .get(studentId)) as any;
  const lastFee = (await db
    .prepare('SELECT * FROM fees WHERE student_id = ? AND period_to IS NOT NULL ORDER BY period_to DESC LIMIT 1')
    .get(studentId)) as any;
  const maxReceipt = (await db
    .prepare(`SELECT COALESCE(MAX(NULLIF(regexp_replace(receipt_number, '\\D', '', 'g'), '')::int), 0) as max FROM fees`)
    .get()) as any;

  const feeType = item?.fee_type || 'Monthly';
  const months = PERIOD_MONTHS[feeType] || 0;
  let periodFrom: string | null = null;
  let periodTo: string | null = null;
  if (months > 0) {
    // Auto-advance: next period starts the day after the last collected period
    const startStr = lastFee?.period_to
      ? iso(new Date(new Date(lastFee.period_to + 'T00:00:00').getTime() + 86400000))
      : item?.from_date || new Date().toISOString().slice(0, 10);
    const from = new Date(startStr + 'T00:00:00');
    periodFrom = iso(from);
    periodTo = iso(lastDayOfPeriod(from, months));
  }

  return NextResponse.json({
    feeItem: item || null,
    suggestedAmount: item ? Number(item.amount) : 0,
    feeType,
    periodFrom,
    periodTo,
    nextReceipt: String((maxReceipt?.max || 0) + 1),
    partialSupported: !!item?.partial_supported,
  });
}

// POST { amount_paid, discount, payment_mode, payment_date, period_from, period_to, remarks, fee_item_id }
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();
  const studentId = Number(params.id);

  const amountPaid = Number(data.amount_paid) || 0;
  const discount = Number(data.discount) || 0;
  if (amountPaid <= 0) return NextResponse.json({ error: 'Paid amount must be greater than zero.' }, { status: 400 });

  const item = data.fee_item_id
    ? ((await db.prepare('SELECT * FROM student_fee_items WHERE id = ?').get(Number(data.fee_item_id))) as any)
    : ((await db
        .prepare('SELECT * FROM student_fee_items WHERE student_id = ? AND active = 1 ORDER BY id LIMIT 1')
        .get(studentId)) as any);
  const courseFee = item ? Number(item.amount) : amountPaid + discount;
  const remainingDue = Math.max(courseFee - amountPaid - discount, 0);

  if (remainingDue > 0 && item && !item.partial_supported) {
    return NextResponse.json(
      { error: 'Partial payment is not enabled for this fee item. Collect the full amount or enable partial fee.' },
      { status: 400 }
    );
  }

  const maxReceipt = (await db
    .prepare(`SELECT COALESCE(MAX(NULLIF(regexp_replace(receipt_number, '\\D', '', 'g'), '')::int), 0) as max FROM fees`)
    .get()) as any;
  const receiptNumber = data.receipt_number || String((maxReceipt?.max || 0) + 1);

  const result = await db
    .prepare(
      `INSERT INTO fees (student_id, course_fee, amount_paid, remaining_due, payment_date, payment_mode,
        receipt_number, due_date, remarks, fee_type, discount, period_from, period_to, fee_item_id)
       VALUES (@student_id, @course_fee, @amount_paid, @remaining_due, @payment_date, @payment_mode,
        @receipt_number, @due_date, @remarks, @fee_type, @discount, @period_from, @period_to, @fee_item_id)`
    )
    .run({
      student_id: studentId,
      course_fee: courseFee,
      amount_paid: amountPaid,
      remaining_due: remainingDue,
      payment_date: data.payment_date || new Date().toISOString().slice(0, 10),
      payment_mode: data.payment_mode || 'Cash',
      receipt_number: receiptNumber,
      due_date: data.due_date || null,
      remarks: data.remarks || null,
      fee_type: item?.fee_type || 'CourseWise',
      discount,
      period_from: data.period_from || null,
      period_to: data.period_to || null,
      fee_item_id: item?.id || null,
    });

  return NextResponse.json({ id: result.lastInsertRowid, receipt_number: receiptNumber });
}
