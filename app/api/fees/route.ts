import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const search = req.nextUrl.searchParams.get('search') || '';
  const dueOnly = req.nextUrl.searchParams.get('due') === '1';
  const studentId = req.nextUrl.searchParams.get('student_id') || '';
  const month = req.nextUrl.searchParams.get('month') || '';
  const db = getDb();
  let query = `SELECT f.*, s.name as student_name, s.mobile, s.batch_id, b.name as batch_name, b.advance_fee,
      (SELECT gu.name FROM student_guardians sg JOIN users gu ON gu.id = sg.guardian_user_id
        WHERE sg.student_id = s.id LIMIT 1) as guardian_name,
      (SELECT gu.mobile FROM student_guardians sg JOIN users gu ON gu.id = sg.guardian_user_id
        WHERE sg.student_id = s.id LIMIT 1) as guardian_mobile
    FROM fees f LEFT JOIN students s ON f.student_id = s.id
    LEFT JOIN batches b ON s.batch_id = b.id
    WHERE 1=1`;
  const params: any[] = [];
  if (dueOnly) query += ' AND f.remaining_due > 0';
  if (studentId) {
    query += ' AND f.student_id = ?';
    params.push(studentId);
  }
  if (month) {
    query += ' AND f.payment_date LIKE ?';
    params.push(`${month}%`);
  }
  if (search) {
    query += ' AND (s.name LIKE ? OR s.mobile LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  query += dueOnly ? ' ORDER BY f.remaining_due DESC' : ' ORDER BY f.payment_date DESC';
  const items = db.prepare(query).all(...params);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.student_id) return NextResponse.json({ error: 'Student is required.' }, { status: 400 });
  const courseFee = Number(data.course_fee) || 0;
  const amountPaid = Number(data.amount_paid) || 0;
  const remainingDue = Math.max(courseFee - amountPaid, 0);
  const db = getDb();
  // Default the fee type from the student's assigned fee plan
  const student = db.prepare('SELECT fee_type FROM students WHERE id = ?').get(data.student_id) as any;
  const result = db
    .prepare(
      `INSERT INTO fees (student_id, course_fee, amount_paid, remaining_due, payment_date, payment_mode, receipt_number, due_date, remarks, fee_type)
       VALUES (@student_id, @course_fee, @amount_paid, @remaining_due, @payment_date, @payment_mode, @receipt_number, @due_date, @remarks, @fee_type)`
    )
    .run({
      student_id: data.student_id,
      fee_type: data.fee_type || student?.fee_type || 'CourseWise',
      course_fee: courseFee,
      amount_paid: amountPaid,
      remaining_due: remainingDue,
      payment_date: data.payment_date || new Date().toISOString().slice(0, 10),
      payment_mode: data.payment_mode || 'Cash',
      receipt_number: data.receipt_number || null,
      due_date: data.due_date || null,
      remarks: data.remarks || null,
    });
  return NextResponse.json({ id: result.lastInsertRowid });
}
