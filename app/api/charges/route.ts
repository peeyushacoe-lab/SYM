import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { computeFeeItemDue, effectiveAsOf, FeeItem, FeeRow } from '@/lib/feeEngine';

// GET -> one summary row per "charge batch" (one Add-charge action), with how
// many students it was applied to and how much of it is collected so far.
export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();

  const items = (await db
    .prepare(
      `SELECT sfi.id, sfi.student_id, sfi.category, sfi.fee_type, sfi.from_date, sfi.amount, sfi.partial_supported,
              sfi.active, sfi.charge_batch, sfi.created_at,
              s.name as student_name, s.roll_number, b.end_date as batch_end_date
       FROM student_fee_items sfi
       JOIN students s ON s.id = sfi.student_id
       LEFT JOIN batches b ON s.batch_id = b.id
       WHERE sfi.school_id = ? AND sfi.charge_batch IS NOT NULL
       ORDER BY sfi.created_at DESC`
    )
    .all(auth.session.schoolId)) as any[];

  const groups = new Map<string, any>();
  const asOf = new Date().toISOString().slice(0, 10);

  for (const row of items) {
    if (!groups.has(row.charge_batch)) {
      groups.set(row.charge_batch, {
        charge_batch: row.charge_batch,
        category: row.category,
        fee_type: row.fee_type,
        amount: row.amount,
        from_date: row.from_date,
        created_at: row.created_at,
        partial_supported: !!row.partial_supported,
        student_count: 0,
        active_count: 0,
        total_billed: 0,
        total_collected: 0,
        total_due: 0,
      });
    }
    const g = groups.get(row.charge_batch);
    g.student_count += 1;
    if (row.active) g.active_count += 1;

    // Payments already collected against this specific item (fee_item_id
    // link is set correctly for anything collected via the wizard/collect
    // route — see the fee-overcount fix for why this can't just be a raw
    // SUM(remaining_due) on `fees`).
    const payments = (await db
      .prepare('SELECT amount_paid, discount, period_from, period_to, remaining_due FROM fees WHERE fee_item_id = ?')
      .all(row.id)) as FeeRow[];
    const item: FeeItem = { id: row.id, fee_type: row.fee_type, from_date: row.from_date, amount: row.amount, partial_supported: row.partial_supported };
    const due = computeFeeItemDue(item, payments, effectiveAsOf(asOf, row.batch_end_date));
    g.total_billed += due.totalDueEver;
    g.total_collected += due.totalPaidEver;
    g.total_due += row.active ? due.totalDueForRange : 0;
  }

  return NextResponse.json({ items: Array.from(groups.values()) });
}

// POST { scope: 'batch'|'course'|'students', batch_id?, course?, student_ids?,
//        category, custom_category?, fee_type, amount, partial_supported, from_date }
export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();

  const category = data.category === 'Other' ? String(data.custom_category || '').trim() : String(data.category || '').trim();
  if (!category) return NextResponse.json({ error: 'A charge category/name is required.' }, { status: 400 });
  const feeType = ['Monthly', 'Quarterly', 'OneTime'].includes(data.fee_type) ? data.fee_type : 'OneTime';
  const amount = Number(data.amount);
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Enter a valid amount.' }, { status: 400 });
  const fromDate = data.from_date || new Date().toISOString().slice(0, 10);
  const partialSupported = Number(data.partial_supported) ? 1 : 0;

  let studentIds: number[] = [];
  if (data.scope === 'batch') {
    if (!data.batch_id) return NextResponse.json({ error: 'Select a batch.' }, { status: 400 });
    const batch = await db.prepare('SELECT id FROM batches WHERE id = ? AND school_id = ?').get(data.batch_id, auth.session.schoolId);
    if (!batch) return NextResponse.json({ error: 'Batch not found.' }, { status: 404 });
    const rows = (await db.prepare('SELECT id FROM students WHERE batch_id = ? AND school_id = ?').all(data.batch_id, auth.session.schoolId)) as any[];
    studentIds = rows.map((r) => r.id);
  } else if (data.scope === 'course') {
    if (!data.course) return NextResponse.json({ error: 'Select a course.' }, { status: 400 });
    const rows = (await db.prepare('SELECT id FROM students WHERE course = ? AND school_id = ?').all(data.course, auth.session.schoolId)) as any[];
    studentIds = rows.map((r) => r.id);
  } else if (data.scope === 'students') {
    const ids = Array.isArray(data.student_ids) ? data.student_ids.map((x: any) => Number(x)).filter(Boolean) : [];
    if (!ids.length) return NextResponse.json({ error: 'Select at least one student.' }, { status: 400 });
    // Validate every id actually belongs to this school before charging them.
    const rows = (await db
      .prepare(`SELECT id FROM students WHERE school_id = ? AND id IN (${ids.map(() => '?').join(',')})`)
      .all(auth.session.schoolId, ...ids)) as any[];
    studentIds = rows.map((r) => r.id);
  } else {
    return NextResponse.json({ error: 'Invalid scope.' }, { status: 400 });
  }

  if (!studentIds.length) {
    return NextResponse.json({ error: 'No students matched the selected scope.' }, { status: 400 });
  }

  const chargeBatch = `chg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  for (const studentId of studentIds) {
    await db
      .prepare(
        `INSERT INTO student_fee_items (student_id, category, fee_type, from_date, amount, partial_supported, active, school_id, charge_batch)
         VALUES (@student_id, @category, @fee_type, @from_date, @amount, @partial_supported, 1, @school_id, @charge_batch)`
      )
      .run({
        student_id: studentId,
        category,
        fee_type: feeType,
        from_date: fromDate,
        amount,
        partial_supported: partialSupported,
        school_id: auth.session.schoolId,
        charge_batch: chargeBatch,
      });
  }

  return NextResponse.json({ ok: true, charge_batch: chargeBatch, count: studentIds.length });
}
