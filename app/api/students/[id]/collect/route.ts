import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { computeFeeItemDue, effectiveAsOf, monthsSpanned, FeeItem, FeeRow } from '@/lib/feeEngine';

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
  const batch = (await db
    .prepare('SELECT b.end_date FROM students s LEFT JOIN batches b ON s.batch_id = b.id WHERE s.id = ?')
    .get(studentId)) as any;
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

  const asOf = effectiveAsOf(new Date().toISOString().slice(0, 10), batch?.end_date);
  const due = computeFeeItemDue(item, payments, asOf);

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

  // A client-supplied fee_item_id must belong to THIS student — otherwise a
  // stale id from a different student's page could apply a payment against
  // another student's fee plan (wrong arrears reduction, wrong student billed).
  const item = data.fee_item_id
    ? ((await db
        .prepare('SELECT * FROM student_fee_items WHERE id = ? AND student_id = ?')
        .get(Number(data.fee_item_id), studentId)) as FeeItem | undefined)
    : ((await db
        .prepare('SELECT * FROM student_fee_items WHERE student_id = ? AND active = 1 ORDER BY id LIMIT 1')
        .get(studentId)) as FeeItem | undefined);

  if (data.fee_item_id && !item) {
    return NextResponse.json({ error: 'This fee item does not belong to this student.' }, { status: 400 });
  }

  // Recompute the amount owed AND the legitimate period server-side — never
  // trust a client-supplied period or total. Without this, a caller could
  // submit an arbitrary period range to under/over-bill an arrears
  // collection, or silently "forgive" elapsed unpaid months by closing out a
  // shorter range than what's actually owed.
  const isRecurring = ['Monthly', 'Quarterly'].includes(item?.fee_type || '');
  let periodFrom = data.period_from || null;
  let periodTo = data.period_to || null;
  let courseFee = item ? Number(item.amount) : amountPaid + discount;

  if (item && isRecurring) {
    const existingPayments = (await db
      .prepare('SELECT amount_paid, discount, period_from, period_to, remaining_due FROM fees WHERE fee_item_id = ?')
      .all(item.id)) as FeeRow[];
    const batch = (await db
      .prepare('SELECT b.end_date FROM students s LEFT JOIN batches b ON s.batch_id = b.id WHERE s.id = ?')
      .get(studentId)) as any;
    const asOf = effectiveAsOf(new Date().toISOString().slice(0, 10), batch?.end_date);
    const due = computeFeeItemDue(item, existingPayments, asOf);
    if (due.periodsElapsed === 0 || !due.periodFrom || !due.periodTo) {
      return NextResponse.json({ error: 'Nothing is due yet for this fee item.' }, { status: 400 });
    }
    // The only legitimate range to bill is exactly the currently-outstanding
    // one — the client may only ever be requesting THIS collection.
    periodFrom = due.periodFrom;
    periodTo = due.periodTo;
    courseFee = monthsSpanned(periodFrom, periodTo, item.fee_type) * Number(item.amount);
  }

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
      period_from: periodFrom,
      period_to: periodTo,
      fee_item_id: item?.id || null,
    });

  return NextResponse.json({ id: result.lastInsertRowid, receipt_number: receiptNumber });
}
