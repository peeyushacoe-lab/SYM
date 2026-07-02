import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { buildReceiptPdf } from '@/lib/receipt-pdf';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT f.*, s.name as student_name, s.mobile, b.name as batch_name
       FROM fees f LEFT JOIN students s ON f.student_id = s.id
       LEFT JOIN batches b ON s.batch_id = b.id WHERE f.id = ?`
    )
    .get(params.id) as any;
  if (!row) return NextResponse.json({ error: 'Fee record not found.' }, { status: 404 });

  const pdf = await buildReceiptPdf(row);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receipt-${row.receipt_number || row.id}.pdf"`,
    },
  });
}
