import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { computeFeeItemDue, FeeItem, FeeRow } from '@/lib/feeEngine';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const mmdd = today.slice(5); // MM-DD for birthdays

  const one = async (sql: string, ...params: any[]) =>
    ((await db.prepare(sql).get(...params)) as any) || {};

  const [
    studentsActive, studentsClosed, batches, staffCount, enquiriesTotal, enquiriesActive, enquiriesClosed,
    feeToday, feeMonth, feeAll,
    expToday, expMonth, expAll,
    dueAgg, examsTotal, birthdays,
    studAttToday, studTotal, staffAttToday,
    attendanceSummary,
  ] = await Promise.all([
    one(`SELECT COUNT(*) c FROM students WHERE COALESCE(status,'Active') = 'Active'`),
    one(`SELECT COUNT(*) c FROM students WHERE status = 'Closed'`),
    one('SELECT COUNT(*) c FROM batches'),
    one('SELECT COUNT(*) c FROM staff'),
    one('SELECT COUNT(*) c FROM enquiries'),
    one(`SELECT COUNT(*) c FROM enquiries WHERE status NOT IN ('Joined','Not Interested','Lost')`),
    one(`SELECT COUNT(*) c FROM enquiries WHERE status IN ('Joined','Not Interested','Lost')`),
    one('SELECT COALESCE(SUM(amount_paid),0) t FROM fees WHERE payment_date = ?', today),
    one('SELECT COALESCE(SUM(amount_paid),0) t FROM fees WHERE payment_date LIKE ?', `${monthStr}%`),
    one('SELECT COALESCE(SUM(amount_paid),0) t FROM fees'),
    one('SELECT COALESCE(SUM(amount),0) t FROM expenses WHERE expense_date = ?', today),
    one('SELECT COALESCE(SUM(amount),0) t FROM expenses WHERE expense_date LIKE ?', `${monthStr}%`),
    one('SELECT COALESCE(SUM(amount),0) t FROM expenses'),
    one(`SELECT COUNT(DISTINCT student_id) c, COALESCE(SUM(remaining_due),0) t FROM fees WHERE remaining_due > 0 AND fee_item_id IS NULL`),
    one('SELECT COUNT(*) c FROM exams'),
    db.prepare(`SELECT id, name, dob, mobile FROM students WHERE dob IS NOT NULL AND substr(dob, 6, 5) = ? AND COALESCE(status,'Active') = 'Active'`).all(mmdd),
    one('SELECT COUNT(DISTINCT student_id) c FROM attendance WHERE date = ?', today),
    one(`SELECT COUNT(*) c FROM students WHERE COALESCE(status,'Active') = 'Active'`),
    one('SELECT COUNT(DISTINCT staff_id) c FROM staff_attendance WHERE date = ?', today),
    db.prepare(
      `SELECT date, status, COUNT(*) c FROM attendance WHERE date LIKE ? GROUP BY date, status ORDER BY date`
    ).all(`${monthStr}%`),
  ]);

  // Live arrears from active fee items (e.g. a late joiner owing months
  // since the batch started) aren't stored as fee rows until collected, so
  // they must be computed on the fly and added to the legacy due total above.
  const activeItems = (await db
    .prepare(`SELECT id, fee_type, from_date, amount, partial_supported, student_id FROM student_fee_items WHERE active = 1`)
    .all()) as any[];
  let itemDueTotal = 0;
  let itemDueStudents = 0;
  for (const row of activeItems) {
    const item: FeeItem = row;
    const payments = (await db
      .prepare('SELECT amount_paid, discount, period_from, period_to, remaining_due FROM fees WHERE fee_item_id = ?')
      .all(item.id)) as FeeRow[];
    const due = computeFeeItemDue(item, payments);
    if (due.outstandingAcrossAllTime > 0) {
      itemDueTotal += due.outstandingAcrossAllTime;
      itemDueStudents += 1;
    }
  }

  const recentEnquiries = await db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 5').all();
  const incomeVsExpense = await db
    .prepare(
      `SELECT left(payment_date, 7) as month, SUM(amount_paid) as total
       FROM fees WHERE payment_date IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 6`
    )
    .all();
  const expenseByMonth = await db
    .prepare(
      `SELECT left(expense_date, 7) as month, SUM(amount) as total
       FROM expenses WHERE expense_date IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 6`
    )
    .all();

  return NextResponse.json({
    // Tufee-style overview
    students: studentsActive.c || 0,
    studentsClosed: studentsClosed.c || 0,
    batches: batches.c || 0,
    staff: staffCount.c || 0,
    enquiries: enquiriesTotal.c || 0,
    enquiriesActive: enquiriesActive.c || 0,
    enquiriesClosed: enquiriesClosed.c || 0,
    exams: examsTotal.c || 0,
    birthdaysToday: birthdays,
    // Monthly summary
    collected: { today: feeToday.t || 0, month: feeMonth.t || 0, allTime: feeAll.t || 0 },
    spent: { today: expToday.t || 0, month: expMonth.t || 0, allTime: expAll.t || 0 },
    // Due fees (legacy standalone rows + live fee-item arrears)
    dueStudents: (dueAgg.c || 0) + itemDueStudents,
    dueFees: Number(dueAgg.t || 0) + itemDueTotal,
    // Attendance progress
    studentAttendanceMarked: studAttToday.c || 0,
    studentAttendanceTotal: studTotal.c || 0,
    staffAttendanceMarked: staffAttToday.c || 0,
    staffAttendanceTotal: staffCount.c || 0,
    attendanceSummary,
    month: monthStr,
    // Legacy fields kept for other consumers
    feeCollected: feeAll.t || 0,
    expenses: expAll.t || 0,
    monthlyIncome: feeMonth.t || 0,
    monthlyExpense: expMonth.t || 0,
    recentEnquiries,
    incomeVsExpense,
    expenseByMonth,
  });
}
