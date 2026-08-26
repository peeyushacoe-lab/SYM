import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { computeFeeItemDue, monthsSpanned, FeeItem, FeeRow } from '@/lib/feeEngine';

// GET -> next suggested collection: sums ALL elapsed unpaid periods since the
// fee item's own start date (usually the batch's start date), not just one
// month. A student joining mid-batch is expected to owe for the months that
// already elapsed before they joined — the fee covers the whole batch/course,
// not just time-since-enrollment.
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const studentId = Number(params.id);

  const item = (await db
    .prepare('SELECT * FROM student_fee_items WHERE student_id = ? AND active = 1 ORDER BY id LIMIT 1')
    .get(studentId)) as FeeItem | undefined;
  const maxReceipt = (await db
    .prepare(`SELECT COALESCE(MAX(NULLIF(regexp_replace(receipt_number, '\\D', '', 'g'), '')::int), 0) as max FROM fees`)
    .get()) as any;

  if (!item) {
    return NextResponse.json({
      feeItem: null,
      suggestedAmount: 0,
      feeType: 'CourseWise',
      periodFrom: null,
      periodTo: null,
      periodsElapsed: 0,
      nextReceipt: String((maxReceipt?.max || 0) + 1),
      partialSupported: false,
    });
  }

  const payments = (await db
    .prepare('SELECT amount_paid, discount, period_from, period_to, remaining_due FROM fees WHERE fee_item_id = ?')
    .all(item.id)) as FeeRow[];

  const due = computeFeeItemDue(item, payments);

  return NextResponse.json({
    feeItem: item,
    suggestedAmount: due.totalDueForRange,
    feeType: item.fee_type,
    periodFrom: due.periodFrom,
    periodTo: due.periodTo,
    periodsElapsed: due.periodsElapsed,
    outstandingAcrossAllTime: due.outstandingAcrossAllTime,
    totalDueEver: due.totalDueEver,
    totalPaidEver: due.totalPaidEver,
    nextReceipt: String((maxReceipt?.max || 0) + 1),
    partialSupported: !!item.partial_supported,
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
    ? ((await db.prepare('SELECT * FROM student_fee_items WHERE id = ?').get(Number(data.fee_item_id))) as FeeItem | undefined)
    : ((await db
        .prepare('SELECT * FROM student_fee_items WHERE student_id = ? AND active = 1 ORDER BY id LIMIT 1')
        .get(studentId)) as FeeItem | undefined);

  // Recompute the amount owed for the given period server-side — never trust
  // a client-supplied total. For recurring fee types (Monthly/Quarterly) this
  // is (number of periods spanned) x (per-period amount), so a 5-month
  // arrears collection correctly bills 5 x the monthly rate, not just 1.
  const periodMonths = ['Monthly', 'Quarterly'].includes(item?.fee_type || '');
  const courseFee =
    item && periodMonths && data.period_from && data.period_to
      ? monthsSpanned(data.period_from, data.period_to, item.fee_type) * Number(item.amount)
      : item
        ? Number(item.amount)
        : amountPaid + discount;

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
