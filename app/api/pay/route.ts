import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { getStudentByUserId, guardianOwnsStudent } from '@/lib/portal';

// Demo-mode online payment against a fee record, usable by students (own fees)
// and guardians (linked children). A real gateway can replace this later.
export async function POST(req: NextRequest) {
  const auth = await requireRole('student', 'guardian');
  if ('error' in auth) return auth.error;
  const { fee_id, amount } = await req.json();
  if (!fee_id || !amount || amount <= 0) {
    return NextResponse.json({ error: 'Fee and a positive amount are required.' }, { status: 400 });
  }

  const db = getDb();
  const fee = (await db.prepare('SELECT * FROM fees WHERE id = ?').get(fee_id)) as any;
  if (!fee) return NextResponse.json({ error: 'Fee record not found.' }, { status: 404 });

  if (auth.session.role === 'student') {
    const student = await getStudentByUserId(auth.session.id);
    if (!student || student.id !== fee.student_id) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    }
  } else if (!(await guardianOwnsStudent(auth.session.id, fee.student_id))) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  if (amount > fee.remaining_due) {
    return NextResponse.json({ error: 'Amount exceeds the remaining due.' }, { status: 400 });
  }

  const transaction_ref = 'TEST-' + Date.now().toString(36).toUpperCase();
  const tx = db.transaction(async () => {
    await db
      .prepare('UPDATE fees SET amount_paid = amount_paid + ?, remaining_due = remaining_due - ? WHERE id = ?')
      .run(amount, amount, fee_id);
    await db
      .prepare(
        'INSERT INTO payments (fee_id, student_id, amount, method, status, transaction_ref, paid_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(fee_id, fee.student_id, amount, 'Online (Test)', 'success', transaction_ref, auth.session.id);
  });
  await tx();

  return NextResponse.json({ ok: true, transaction_ref });
}
