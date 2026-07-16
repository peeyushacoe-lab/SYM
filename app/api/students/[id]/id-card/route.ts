import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { buildIdCardPdf } from '@/lib/id-card-pdf';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();
  const row = (await db
    .prepare(`SELECT s.*, b.name as batch_name FROM students s LEFT JOIN batches b ON s.batch_id = b.id WHERE s.id = ?`)
    .get(params.id)) as any;
  if (!row) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });

  const pdf = await buildIdCardPdf(row);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="id-card-${row.name || row.id}.pdf"`,
    },
  });
}
