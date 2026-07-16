import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string; docId: string }> }) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();
  const row = (await db
    .prepare('SELECT * FROM student_documents WHERE id = ? AND student_id = ?')
    .get(params.docId, params.id)) as any;
  if (!row) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });

  const match = /^data:([^;]+);base64,(.+)$/.exec(row.data_url);
  if (!match) return NextResponse.json({ error: 'Invalid document data.' }, { status: 500 });
  const buf = Buffer.from(match[2], 'base64');
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': row.mime_type || match[1] || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${row.file_name}"`,
    },
  });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string; docId: string }> }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();
  await db.prepare('DELETE FROM student_documents WHERE id = ? AND student_id = ?').run(params.docId, params.id);
  return NextResponse.json({ ok: true });
}
