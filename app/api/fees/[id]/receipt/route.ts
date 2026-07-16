import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { buildReceiptPdf } from '@/lib/receipt-pdf';
import { getStudentByUserId, guardianOwnsStudent } from '@/lib/portal';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('management', 'student', 'guardian');
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();
  const row = (await db
    .prepare(
      `SELECT f.*, s.name as student_name, s.mobile, b.name as batch_name
       FROM fees f LEFT JOIN students s ON f.student_id = s.id
       LEFT JOIN batches b ON s.batch_id = b.id WHERE f.id = ?`
    )
    .get(params.id)) as any;
  if (!row) return NextResponse.json({ error: 'Fee record not found.' }, { status: 404 });

  // Students can only fetch their own receipts; guardians only their children's.
  if (auth.session.role === 'student') {
    const student = await getStudentByUserId(auth.session.id);
    if (!student || student.id !== row.student_id) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    }
  } else if (auth.session.role === 'guardian' && !(await guardianOwnsStudent(auth.session.id, row.student_id))) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const pdf = await buildReceiptPdf(row);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receipt-${row.receipt_number || row.id}.pdf"`,
    },
  });
}
