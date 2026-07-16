import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();

  const students = ((await db.prepare('SELECT COUNT(*) as count FROM students').get()) as any).count;
  const batches = ((await db.prepare('SELECT COUNT(*) as count FROM batches').get()) as any).count;
  const staff = ((await db.prepare('SELECT COUNT(*) as count FROM staff').get()) as any).count;
  const enquiries = ((await db.prepare('SELECT COUNT(*) as count FROM enquiries').get()) as any).count;
  const feeCollected = ((await db.prepare('SELECT COALESCE(SUM(amount_paid),0) as total FROM fees').get()) as any).total;
  const dueFees = (
    (await db.prepare('SELECT COALESCE(SUM(remaining_due),0) as total FROM fees WHERE remaining_due > 0').get()) as any
  ).total;
  const expenses = ((await db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM expenses').get()) as any).total;

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyIncome = (
    (await db.prepare('SELECT COALESCE(SUM(amount_paid),0) as total FROM fees WHERE payment_date LIKE ?').get(`${monthStr}%`)) as any
  ).total;
  const monthlyExpense = (
    (await db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date LIKE ?').get(`${monthStr}%`)) as any
  ).total;

  const recentEnquiries = await db
    .prepare('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 5')
    .all();

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
    students,
    batches,
    staff,
    enquiries,
    feeCollected,
    dueFees,
    expenses,
    monthlyIncome,
    monthlyExpense,
    recentEnquiries,
    incomeVsExpense,
    expenseByMonth,
  });
}
