import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { computeFeeItemDue, effectiveAsOf, FeeItem, FeeRow } from '@/lib/feeEngine';

// GET -> every active fee item for this student that currently has something
// due, each with its own suggested "full" amount — used by the Record
// Payment wizard (Fees page: batch/course -> student -> pick a pending fee)
// so an admin can see and choose between, say, a Monthly tuition fee AND a
// separate Transport fee, rather than only ever billing whichever fee item
// happens to be first.
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const studentId = Number(params.id);

  const student = (await db
    .prepare('SELECT id, name, roll_number FROM students WHERE id = ? AND school_id = ?')
    .get(studentId, auth.session.schoolId)) as any;
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });

  const activeItems = (await db
    .prepare('SELECT * FROM student_fee_items WHERE student_id = ? AND school_id = ? AND active = 1 ORDER BY id')
    .all(studentId, auth.session.schoolId)) as (FeeItem & { category: string | null })[];

  const batch = (await db
    .prepare('SELECT b.end_date FROM students s LEFT JOIN batches b ON s.batch_id = b.id WHERE s.id = ?')
    .get(studentId)) as any;
  const asOf = effectiveAsOf(new Date().toISOString().slice(0, 10), batch?.end_date);

  const maxReceipt = (await db
    .prepare(`SELECT COALESCE(MAX(NULLIF(regexp_replace(receipt_number, '\\D', '', 'g'), '')::int), 0) as max FROM fees WHERE school_id = ?`)
    .get(auth.session.schoolId)) as any;

  // Payments recorded through the old flat "Record payment" form (before
  // structured fee items existed) never got a fee_item_id, so they'd
  // otherwise be invisible here and get double-billed. Pull every fees row
  // for this student once and match the untracked (fee_item_id IS NULL) ones
  // to whichever active item shares its fee_type — best-effort, since that's
  // the only link the old data has, but it's what avoids re-charging money
  // that was already collected the old way.
  const allFeesRows = (await db
    .prepare('SELECT id, fee_item_id, fee_type, amount_paid, discount, period_from, period_to, remaining_due FROM fees WHERE student_id = ? AND school_id = ?')
    .all(studentId, auth.session.schoolId)) as (FeeRow & { id: number; fee_item_id: number | null; fee_type: string })[];
  const usedLegacyIds = new Set<number>();

  const items = [];
  for (const item of activeItems) {
    const linked = allFeesRows.filter((r) => r.fee_item_id === item.id);
    const legacyMatches = allFeesRows.filter(
      (r) => r.fee_item_id == null && r.fee_type === item.fee_type && !usedLegacyIds.has(r.id)
    );
    legacyMatches.forEach((r) => usedLegacyIds.add(r.id));
    const payments = [...linked, ...legacyMatches] as FeeRow[];
    const due = computeFeeItemDue(item, payments, asOf);
    if (due.totalDueForRange > 0) {
      items.push({
        fee_item_id: item.id,
        category: item.category,
        fee_type: item.fee_type,
        amount: item.amount,
        partial_supported: !!item.partial_supported,
        period_from: due.periodFrom,
        period_to: due.periodTo,
        periods_elapsed: due.periodsElapsed,
        amount_due: due.totalDueForRange,
        outstanding_across_all_time: due.outstandingAcrossAllTime,
      });
    }
  }

  return NextResponse.json({
    student: { id: student.id, name: student.name, roll_number: student.roll_number },
    items,
    nextReceipt: String((maxReceipt?.max || 0) + 1),
  });
}
