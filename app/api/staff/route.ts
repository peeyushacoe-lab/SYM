import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const search = req.nextUrl.searchParams.get('search') || '';
  const db = getDb();
  const items = search
    ? db
        .prepare('SELECT * FROM staff WHERE name LIKE ? OR designation LIKE ? OR mobile LIKE ? ORDER BY name')
        .all(`%${search}%`, `%${search}%`, `%${search}%`)
    : db.prepare('SELECT * FROM staff ORDER BY name').all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  const db = getDb();
  const result = db
    .prepare(
      'INSERT INTO staff (name, mobile, designation, salary, joining_date, address, remarks) VALUES (@name, @mobile, @designation, @salary, @joining_date, @address, @remarks)'
    )
    .run({
      name: data.name,
      mobile: data.mobile || null,
      designation: data.designation || null,
      salary: data.salary || 0,
      joining_date: data.joining_date || null,
      address: data.address || null,
      remarks: data.remarks || null,
    });
  return NextResponse.json({ id: result.lastInsertRowid });
}
