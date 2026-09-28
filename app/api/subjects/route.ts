import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const batchId = req.nextUrl.searchParams.get('batch_id') || '';
  const db = getDb();
  let query = `SELECT s.*, b.name as batch_name FROM subjects s LEFT JOIN batches b ON s.batch_id = b.id WHERE s.school_id = ?`;
  const params: any[] = [auth.session.schoolId];
  if (batchId) {
    query += ' AND s.batch_id = ?';
    params.push(batchId);
  }
  query += ' ORDER BY b.name, s.name';
  const items = await db.prepare(query).all(...params);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  if (!data.batch_id) return NextResponse.json({ error: 'Select a batch — add a batch first if none exist yet.' }, { status: 400 });

  const db = getDb();
  const batch = await db.prepare('SELECT id FROM batches WHERE id = ? AND school_id = ?').get(data.batch_id, auth.session.schoolId);
  if (!batch) return NextResponse.json({ error: 'Batch not found.' }, { status: 400 });

  const existing = await db
    .prepare('SELECT id FROM subjects WHERE school_id = ? AND batch_id = ? AND name = ?')
    .get(auth.session.schoolId, data.batch_id, data.name);
  if (existing) return NextResponse.json({ error: 'This subject already exists for that batch.' }, { status: 400 });

  const result = await db
    .prepare('INSERT INTO subjects (name, batch_id, school_id) VALUES (?, ?, ?)')
    .run(data.name, data.batch_id, auth.session.schoolId);
  return NextResponse.json({ id: result.lastInsertRowid });
}
