import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();

  const students = (db.prepare('SELECT COUNT(*) as count FROM students').get() as any).count;
  const batches = (db.prepare('SELECT COUNT(*) as count FROM batches').get() as any).count;
  const staff = (db.prepare('SELECT COUNT(*) as count FROM staff').get() as any).count;
  const enquiries = (db.prepare('SELECT COUNT(*) as count FROM enquiries').get() as any).count;
  const feeCollected = (db.prepare('SELECT COALESCE(SUM(amount_paid),0) as total FROM fees').get() as any).total;
  const dueFees = (
    db.prepare('SELECT COALESCE(SUM(remaining_due),0) as total FROM fees WHERE remaining_due > 0').get() as any
  ).total;
  const expenses = (db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM expenses').get() as any).total;

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyIncome = (
    db.prepare('SELECT COALESCE(SUM(amount_paid),0) as total FROM fees WHERE payment_date LIKE ?').get(`${monthStr}%`) as any
  ).total;
  const monthlyExpense = (
    db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date LIKE ?').get(`${monthStr}%`) as any
  ).total;

  const recentEnquiries = db
    .prepare('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 5')
    .all();

  const incomeVsExpense = db
    .prepare(
      `SELECT strftime('%Y-%m', payment_date) as month, SUM(amount_paid) as total
       FROM fees WHERE payment_date IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 6`
    )
    .all();
  const expenseByMonth = db
    .prepare(
      `SELECT strftime('%Y-%m', expense_date) as month, SUM(amount) as total
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
