import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { computeFeeItemDue, effectiveAsOf, FeeItem, FeeRow } from '@/lib/feeEngine';

// Due fees combine two sources:
// 1. Legacy/standalone fee rows not tied to a fee item (old single collections).
// 2. Active fee-item arrears — computed live so a brand-new fee item with
//    elapsed unpaid months (e.g. a late joiner owing since the batch's start)
//    shows up immediately, even before any collection has ever happened.
export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const search = req.nextUrl.searchParams.get('search') || '';
  const db = getDb();

  const guardianJoin = `
      (SELECT gu.name FROM student_guardians sg JOIN users gu ON gu.id = sg.guardian_user_id
        WHERE sg.student_id = s.id LIMIT 1) as guardian_name,
      (SELECT gu.mobile FROM student_guardians sg JOIN users gu ON gu.id = sg.guardian_user_id
        WHERE sg.student_id = s.id LIMIT 1) as guardian_mobile`;

  let legacyQuery = `SELECT f.id, f.student_id, f.course_fee, f.amount_paid, f.remaining_due, f.due_date,
      s.name as student_name, s.mobile, s.roll_number, s.batch_id, b.name as batch_name, ${guardianJoin}
    FROM fees f LEFT JOIN students s ON f.student_id = s.id
    LEFT JOIN batches b ON s.batch_id = b.id
    WHERE f.school_id = ? AND f.remaining_due > 0 AND f.fee_item_id IS NULL`;
  const legacyParams: any[] = [auth.session.schoolId];
  if (search) {
    legacyQuery += ' AND (s.name ILIKE ? OR s.mobile ILIKE ?)';
    legacyParams.push(`%${search}%`, `%${search}%`);
  }
  const legacyRows = (await db.prepare(legacyQuery).all(...legacyParams)) as any[];

  let itemsQuery = `SELECT sfi.id as item_id, sfi.fee_type, sfi.from_date, sfi.amount, sfi.partial_supported,
      s.id as student_id, s.name as student_name, s.mobile, s.roll_number, s.batch_id, b.name as batch_name, b.end_date as batch_end_date, ${guardianJoin}
    FROM student_fee_items sfi
    JOIN students s ON sfi.student_id = s.id
    LEFT JOIN batches b ON s.batch_id = b.id
    WHERE sfi.school_id = ? AND sfi.active = 1`;
  const itemsParams: any[] = [auth.session.schoolId];
  if (search) {
    itemsQuery += ' AND (s.name ILIKE ? OR s.mobile ILIKE ?)';
    itemsParams.push(`%${search}%`, `%${search}%`);
  }
  const activeItems = (await db.prepare(itemsQuery).all(...itemsParams)) as any[];

  const itemDueRows: any[] = [];
  for (const row of activeItems) {
    const item: FeeItem = {
      id: row.item_id,
      fee_type: row.fee_type,
      from_date: row.from_date,
      amount: row.amount,
      partial_supported: row.partial_supported,
    };
    const payments = (await db
      .prepare('SELECT amount_paid, discount, period_from, period_to, remaining_due FROM fees WHERE fee_item_id = ?')
      .all(item.id)) as FeeRow[];
    const asOf = effectiveAsOf(new Date().toISOString().slice(0, 10), row.batch_end_date);
    const due = computeFeeItemDue(item, payments, asOf);
    if (due.outstandingAcrossAllTime > 0) {
      itemDueRows.push({
        id: `item-${item.id}`,
        student_id: row.student_id,
        student_name: row.student_name,
        mobile: row.mobile,
        roll_number: row.roll_number,
        batch_id: row.batch_id,
        batch_name: row.batch_name,
        guardian_name: row.guardian_name,
        guardian_mobile: row.guardian_mobile,
        course_fee: due.totalDueEver,
        amount_paid: due.totalPaidEver,
        remaining_due: due.outstandingAcrossAllTime,
        due_date: due.periodTo,
        periods_elapsed: due.periodsElapsed,
        period_label: due.periodFrom && due.periodTo ? `${due.periodFrom} → ${due.periodTo}` : null,
      });
    }
  }

  const items = [...legacyRows, ...itemDueRows].sort((a, b) => Number(b.remaining_due) - Number(a.remaining_due));
  return NextResponse.json({ items });
}
