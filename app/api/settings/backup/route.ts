import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const schoolId = auth.session.schoolId;
  const students = await db.prepare('SELECT * FROM students WHERE school_id = ?').all(schoolId);
  const batches = await db.prepare('SELECT * FROM batches WHERE school_id = ?').all(schoolId);
  const staff = await db.prepare('SELECT * FROM staff WHERE school_id = ?').all(schoolId);
  const enquiries = await db.prepare('SELECT * FROM enquiries WHERE school_id = ?').all(schoolId);
  const studentFeeItems = await db.prepare('SELECT * FROM student_fee_items WHERE school_id = ?').all(schoolId);
  const fees = await db.prepare('SELECT * FROM fees WHERE school_id = ?').all(schoolId);
  const expenses = await db.prepare('SELECT * FROM expenses WHERE school_id = ?').all(schoolId);

  return NextResponse.json({
    version: 1,
    timestamp: new Date().toISOString(),
    institute: 'SHIKSHA YOGI',
    counts: {
      students: students.length,
      batches: batches.length,
      staff: staff.length,
      enquiries: enquiries.length,
      student_fee_items: studentFeeItems.length,
      fees: fees.length,
      expenses: expenses.length,
    },
    data: { students, batches, staff, enquiries, student_fee_items: studentFeeItems, fees, expenses },
  });
}
