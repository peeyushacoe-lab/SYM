import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const search = req.nextUrl.searchParams.get('search') || '';
  const db = getDb();
  const items = search
    ? await db.prepare('SELECT * FROM courses WHERE school_id = ? AND name ILIKE ? ORDER BY name').all(auth.session.schoolId, `%${search}%`)
    : await db.prepare('SELECT * FROM courses WHERE school_id = ? ORDER BY name').all(auth.session.schoolId);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Course name is required.' }, { status: 400 });
  const db = getDb();
  try {
    const result = await db
      .prepare('INSERT INTO courses (name, fee, duration, remarks, school_id) VALUES (@name, @fee, @duration, @remarks, @school_id)')
      .run({
        name: String(data.name).trim(),
        fee: Number(data.fee) || 0,
        duration: data.duration || null,
        remarks: data.remarks || null,
        school_id: auth.session.schoolId,
      });
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (e: any) {
    // Postgres reports a unique-violation as SQLSTATE 23505 (message text is
    // "duplicate key value violates unique constraint ..."), not the SQLite
    // wording "UNIQUE constraint failed" this check was originally written for.
    if (e.code === '23505' || /duplicate key/i.test(String(e.message))) {
      return NextResponse.json({ error: 'A course with this name already exists.' }, { status: 400 });
    }
    throw e;
  }
}
