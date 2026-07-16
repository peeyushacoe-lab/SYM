import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const students = await db.prepare('SELECT * FROM students').all();
  const batches = await db.prepare('SELECT * FROM batches').all();
  const staff = await db.prepare('SELECT * FROM staff').all();
  const enquiries = await db.prepare('SELECT * FROM enquiries').all();
  const fees = await db.prepare('SELECT * FROM fees').all();
  const expenses = await db.prepare('SELECT * FROM expenses').all();

  return NextResponse.json({
    version: 1,
    timestamp: new Date().toISOString(),
    institute: 'SHIKSHA YOGI',
    counts: {
      students: students.length,
      batches: batches.length,
      staff: staff.length,
      enquiries: enquiries.length,
      fees: fees.length,
      expenses: expenses.length,
    },
    data: { students, batches, staff, enquiries, fees, expenses },
  });
}
