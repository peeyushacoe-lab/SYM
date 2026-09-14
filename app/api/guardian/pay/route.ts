import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

// Test-mode payment flow. This records the payment and settles the fee
// immediately so the flow can be demoed end-to-end. To go live, swap this
// handler for a real gateway (e.g. Razorpay order + webhook verification)
// using the same request/response shape.
export async function POST(req: NextRequest) {
  const auth = await requireRole('guardian');
  if ('error' in auth) return auth.error;
  const { fee_id, amount } = await req.json();
  if (!fee_id || !amount) {
    return NextResponse.json({ error: 'fee_id and amount are required.' }, { status: 400 });
  }

  const db = getDb();
  const fee = (await db.prepare('SELECT * FROM fees WHERE id = ?').get(fee_id)) as any;
  if (!fee) return NextResponse.json({ error: 'Fee record not found.' }, { status: 404 });

  const owns = await db
    .prepare('SELECT 1 FROM student_guardians WHERE guardian_user_id = ? AND student_id = ?')
    .get(auth.session.id, fee.student_id);
  if (!owns) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  // Reject overpayment outright rather than silently capping it — matches
  // /api/pay's behavior (the endpoint actually wired up in the guardian/student
  // portal today) so the two payment paths can't diverge again.
  const amountNum = Number(amount);
  if (amountNum <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than zero.' }, { status: 400 });
  }
  if (amountNum > fee.remaining_due) {
    return NextResponse.json({ error: 'Amount exceeds the remaining due.' }, { status: 400 });
  }

  const txRef = `TXN-TEST-${Date.now()}`;
  const tx = db.transaction(async () => {
    await db
      .prepare(
        'INSERT INTO payments (fee_id, student_id, amount, method, status, transaction_ref, paid_by) VALUES (?,?,?,?,?,?,?)'
      )
      .run(fee_id, fee.student_id, amountNum, 'Online', 'success', txRef, auth.session.id);

    // Factor in discount, same as the rest of the fee engine — otherwise this
    // path can under-count remaining_due for any discounted fee row.
    const newPaid = Number(fee.amount_paid) + amountNum;
    const newDue = Math.max(Number(fee.course_fee) - newPaid - Number(fee.discount || 0), 0);
    await db.prepare('UPDATE fees SET amount_paid = ?, remaining_due = ? WHERE id = ?').run(newPaid, newDue, fee_id);
  });
  await tx();

  return NextResponse.json({ ok: true, transaction_ref: txRef, amount: amountNum });
}
