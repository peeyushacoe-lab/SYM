import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();
  const items = await db
    .prepare('SELECT id, student_id, doc_type, file_name, mime_type, created_at FROM student_documents WHERE student_id = ? ORDER BY created_at DESC')
    .all(params.id);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const data = await req.json();
  if (!data.file_name || !data.data_url) {
    return NextResponse.json({ error: 'file_name and data_url are required.' }, { status: 400 });
  }
  const db = getDb();
  const result = await db
    .prepare(
      `INSERT INTO student_documents (student_id, doc_type, file_name, mime_type, data_url, uploaded_by)
       VALUES (?,?,?,?,?,?) RETURNING id, student_id, doc_type, file_name, mime_type, created_at`
    )
    .get(params.id, data.doc_type || 'Other', data.file_name, data.mime_type || null, data.data_url, auth.session.id);
  return NextResponse.json({ item: result });
}
