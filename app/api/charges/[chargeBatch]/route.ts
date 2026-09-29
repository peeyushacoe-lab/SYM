import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { computeFeeItemDue, effectiveAsOf, FeeItem, FeeRow } from '@/lib/feeEngine';

// GET -> every student this charge batch was applied to, with their own
// billed/paid/due breakdown for it.
export async function GET(_req: NextRequest, props: { params: Promise<{ chargeBatch: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();

  const rows = (await db
    .prepare(
      `SELECT sfi.id, sfi.student_id, sfi.amount, sfi.fee_type, sfi.from_date, sfi.partial_supported, sfi.active,
              s.name as student_name, s.roll_number, s.mobile, b.name as batch_name, b.end_date as batch_end_date
       FROM student_fee_items sfi
       JOIN students s ON s.id = sfi.student_id
       LEFT JOIN batches b ON s.batch_id = b.id
       WHERE sfi.school_id = ? AND sfi.charge_batch = ?
       ORDER BY s.name`
    )
    .all(auth.session.schoolId, params.chargeBatch)) as any[];

  if (!rows.length) return NextResponse.json({ error: 'Charge not found.' }, { status: 404 });

  const asOf = new Date().toISOString().slice(0, 10);
  const students = [];
  for (const row of rows) {
    const payments = (await db
      .prepare('SELECT amount_paid, discount, period_from, period_to, remaining_due FROM fees WHERE fee_item_id = ?')
      .all(row.id)) as FeeRow[];
    const item: FeeItem = { id: row.id, fee_type: row.fee_type, from_date: row.from_date, amount: row.amount, partial_supported: row.partial_supported };
    const due = computeFeeItemDue(item, payments, effectiveAsOf(asOf, row.batch_end_date));
    students.push({
      fee_item_id: row.id,
      student_id: row.student_id,
      student_name: row.student_name,
      roll_number: row.roll_number,
      mobile: row.mobile,
      batch_name: row.batch_name,
      active: !!row.active,
      total_billed: due.totalDueEver,
      total_collected: due.totalPaidEver,
      total_due: due.totalDueForRange,
    });
  }

  return NextResponse.json({ students });
}

// DELETE -> cancel this charge for every student it was applied to. A
// student who hasn't paid anything against it yet gets the row removed
// outright; one who has already paid something keeps the row (for receipt/
// history integrity) but it's deactivated so no further amount accrues.
export async function DELETE(_req: NextRequest, props: { params: Promise<{ chargeBatch: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();

  const rows = (await db
    .prepare('SELECT id FROM student_fee_items WHERE school_id = ? AND charge_batch = ?')
    .all(auth.session.schoolId, params.chargeBatch)) as any[];
  if (!rows.length) return NextResponse.json({ error: 'Charge not found.' }, { status: 404 });

  let removed = 0;
  let deactivated = 0;
  for (const row of rows) {
    const paid = await db.prepare('SELECT 1 FROM fees WHERE fee_item_id = ? LIMIT 1').get(row.id);
    if (paid) {
      await db.prepare('UPDATE student_fee_items SET active = 0 WHERE id = ?').run(row.id);
      deactivated += 1;
    } else {
      await db.prepare('DELETE FROM student_fee_items WHERE id = ?').run(row.id);
      removed += 1;
    }
  }

  return NextResponse.json({ ok: true, removed, deactivated });
}
