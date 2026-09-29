import getDb from './db';
import { computeFeeItemDue, effectiveAsOf, FeeItem, FeeRow } from './feeEngine';

// Shared read helpers for the student / guardian / teacher portals.

export async function getStudentByUserId(userId: number) {
  const db = getDb();
  return db
    .prepare(
      `SELECT s.*, b.name as batch_name, b.timing, b.course as batch_course
       FROM students s LEFT JOIN batches b ON s.batch_id = b.id WHERE s.user_id = ?`
    )
    .get(userId) as any;
}

export async function guardianOwnsStudent(guardianUserId: number, studentId: number | string): Promise<boolean> {
  const db = getDb();
  return !!(await db
    .prepare('SELECT 1 FROM student_guardians WHERE guardian_user_id = ? AND student_id = ?')
    .get(guardianUserId, studentId));
}

export async function getStudentProfile(studentId: number | string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT s.*, b.name as batch_name, b.timing, b.start_date as batch_start, b.end_date as batch_end,
              b.advance_fee as batch_advance_fee
       FROM students s LEFT JOIN batches b ON s.batch_id = b.id WHERE s.id = ?`
    )
    .get(studentId) as any;
}

export async function getAttendanceSummary(studentId: number | string) {
  const db = getDb();
  const rows = (await db
    .prepare(`SELECT status, COUNT(*) as count FROM attendance WHERE student_id = ? GROUP BY status`)
    .all(studentId)) as { status: string; count: number }[];
  const total = rows.reduce((s, r) => s + Number(r.count), 0);
  const present = Number(rows.find((r) => r.status === 'Present')?.count || 0);
  const absent = Number(rows.find((r) => r.status === 'Absent')?.count || 0);
  const leave = Number(rows.find((r) => r.status === 'Leave')?.count || 0);
  return {
    total,
    present,
    absent,
    leave,
    pct: total ? Math.round((present / total) * 100) : null,
  };
}

// month: 'YYYY-MM'
export async function getAttendanceMonth(studentId: number | string, month: string) {
  const db = getDb();
  return db
    .prepare(`SELECT date, status FROM attendance WHERE student_id = ? AND date LIKE ? ORDER BY date`)
    .all(studentId, `${month}-%`) as Promise<{ date: string; status: string }[]>;
}

export async function getResults(studentId: number | string) {
  const db = getDb();
  // Exams can target either a batch (e.batch_id) or a standalone course
  // (e.course, matched against the student's own course column) — course-
  // based exams were added later and this join originally only handled the
  // batch case, silently hiding every course-based exam/result for students
  // enrolled via a course.
  return db
    .prepare(
      `SELECT e.id as exam_id, e.name, e.subject, e.exam_date, e.max_marks,
              m.marks, m.remarks
       FROM exams e
       JOIN students s ON s.id = ?
         AND ((e.batch_id IS NOT NULL AND s.batch_id = e.batch_id) OR (e.course IS NOT NULL AND s.course = e.course))
       LEFT JOIN exam_marks m ON m.exam_id = e.id AND m.student_id = s.id
       ORDER BY e.exam_date DESC, e.id DESC`
    )
    .all(studentId) as Promise<any[]>;
}

export async function getTimetable(batchId: number | null | undefined) {
  if (!batchId) return [];
  const db = getDb();
  return db
    .prepare(
      `SELECT t.*, u.name as teacher_name FROM timetable_slots t
       LEFT JOIN users u ON t.teacher_user_id = u.id
       WHERE t.batch_id = ? ORDER BY t.day, t.start_time`
    )
    .all(batchId) as Promise<any[]>;
}

export async function getFees(studentId: number | string) {
  const db = getDb();
  const fees = (await db
    .prepare('SELECT * FROM fees WHERE student_id = ? ORDER BY payment_date DESC, id DESC')
    .all(studentId)) as any[];
  const payments = (await db
    .prepare('SELECT * FROM payments WHERE student_id = ? ORDER BY created_at DESC')
    .all(studentId)) as any[];

  // A structured fee item (student_fee_items) accrues dues on the fly — see
  // lib/feeEngine.ts — and only ever gets a row in `fees` once the office
  // actually collects a payment against it. Without this, a student whose
  // fee item has accrued periods but hasn't had a first payment yet would
  // show "Rs. 0 due" here even though management's dashboard/due-fees list
  // correctly shows a real balance — this mirrors the same fix applied to
  // those management-side endpoints (matching legacy fee_item_id-NULL rows
  // by fee_type so old payments aren't double-billed).
  const activeItems = (await db
    .prepare('SELECT * FROM student_fee_items WHERE student_id = ? AND active = 1 ORDER BY id')
    .all(studentId)) as (FeeItem & { category: string | null })[];

  if (activeItems.length) {
    const batch = (await db
      .prepare('SELECT b.end_date FROM students s LEFT JOIN batches b ON s.batch_id = b.id WHERE s.id = ?')
      .get(studentId)) as any;
    const asOf = effectiveAsOf(new Date().toISOString().slice(0, 10), batch?.end_date);
    const usedLegacyIds = new Set<number>();
    for (const item of activeItems) {
      const linked = fees.filter((r) => r.fee_item_id === item.id);
      const legacyMatches = fees.filter(
        (r) => r.fee_item_id == null && r.fee_type === item.fee_type && !usedLegacyIds.has(r.id)
      );
      legacyMatches.forEach((r) => usedLegacyIds.add(r.id));
      const due = computeFeeItemDue(item, [...linked, ...legacyMatches] as FeeRow[], asOf);
      if (due.totalDueForRange > 0) {
        // A synthetic row (id is a string, not a real fees.id) so it can't
        // be "paid" through the online-payment flow, which needs a real
        // fees row to reference — it's here purely so the due total and fee
        // list are accurate. The UI shows it as pending/office-collected.
        fees.unshift({
          id: `item-${item.id}`,
          pending: true,
          fee_item_id: item.id,
          receipt_number: null,
          fee_type: item.fee_type,
          course_fee: due.totalDueEver,
          amount_paid: due.totalPaidEver,
          discount: 0,
          remaining_due: due.totalDueForRange,
          payment_date: null,
          payment_mode: null,
          period_from: due.periodFrom,
          period_to: due.periodTo,
        });
      }
    }
  }

  return { fees, payments };
}

// Total currently outstanding for a student, combining legacy fees rows and
// live-accrued structured fee items — see getFees() above for why both are
// needed. Used anywhere a single "due" number is shown without the full fee
// list (e.g. the guardian children list).
export async function getTotalDue(studentId: number | string): Promise<number> {
  const { fees } = await getFees(studentId);
  return fees.reduce((s: number, f: any) => s + (Number(f.remaining_due) || 0), 0);
}

export async function getLeaveRequests(studentId: number | string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT l.*, u.name as requested_by_name, r.name as responded_by_name
       FROM leave_requests l
       LEFT JOIN users u ON l.requested_by = u.id
       LEFT JOIN users r ON l.responded_by = r.id
       WHERE l.student_id = ? ORDER BY l.created_at DESC`
    )
    .all(studentId) as Promise<any[]>;
}

export async function getQueries(raisedBy: number, studentId?: number | string) {
  const db = getDb();
  if (studentId) {
    return db
      .prepare(
        `SELECT q.*, r.name as responded_by_name FROM queries q
         LEFT JOIN users r ON q.responded_by = r.id
         WHERE q.raised_by = ? AND q.student_id = ? ORDER BY q.created_at DESC`
      )
      .all(raisedBy, studentId) as Promise<any[]>;
  }
  return db
    .prepare(
      `SELECT q.*, r.name as responded_by_name FROM queries q
       LEFT JOIN users r ON q.responded_by = r.id
       WHERE q.raised_by = ? ORDER BY q.created_at DESC`
    )
    .all(raisedBy) as Promise<any[]>;
}

export async function teacherOwnsBatch(teacherUserId: number, batchId: number | string): Promise<boolean> {
  const db = getDb();
  return !!(await db
    .prepare('SELECT 1 FROM teacher_batches WHERE teacher_user_id = ? AND batch_id = ?')
    .get(teacherUserId, batchId));
}

export function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}
