import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const search = req.nextUrl.searchParams.get('search') || '';
  const dueOnly = req.nextUrl.searchParams.get('due') === '1';
  const db = getDb();
  let query = `SELECT f.*, s.name as student_name, s.mobile, s.batch_id, b.name as batch_name
    FROM fees f LEFT JOIN students s ON f.student_id = s.id
    LEFT JOIN batches b ON s.batch_id = b.id WHERE 1=1`;
  const params: any[] = [];
  if (dueOnly) query += ' AND f.remaining_due > 0';
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
  const result = db
    .prepare(
      `INSERT INTO fees (student_id, course_fee, amount_paid, remaining_due, payment_date, payment_mode, receipt_number, remarks)
       VALUES (@student_id, @course_fee, @amount_paid, @remaining_due, @payment_date, @payment_mode, @receipt_number, @remarks)`
    )
    .run({
      student_id: data.student_id,
      course_fee: courseFee,
      amount_paid: amountPaid,
      remaining_due: remainingDue,
      payment_date: data.payment_date || new Date().toISOString().slice(0, 10),
      payment_mode: data.payment_mode || 'Cash',
      receipt_number: data.receipt_number || null,
      remarks: data.remarks || null,
    });
  return NextResponse.json({ id: result.lastInsertRowid });
}
