import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const search = req.nextUrl.searchParams.get('search') || '';
  const db = getDb();
  const query = search
    ? `SELECT s.*, b.name as batch_name FROM students s LEFT JOIN batches b ON s.batch_id = b.id
       WHERE s.name LIKE ? OR s.course LIKE ? OR s.batch_id IN (SELECT id FROM batches WHERE name LIKE ?)
       ORDER BY s.admission_date DESC`
    : `SELECT s.*, b.name as batch_name FROM students s LEFT JOIN batches b ON s.batch_id = b.id ORDER BY s.admission_date DESC`;
  const items = search
    ? await db.prepare(query).all(`%${search}%`, `%${search}%`, `%${search}%`)
    : await db.prepare(query).all();
  return NextResponse.json({ items });
}
