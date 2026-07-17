import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const search = req.nextUrl.searchParams.get('search') || '';
  const status = req.nextUrl.searchParams.get('status') || '';
  const db = getDb();
  let query = 'SELECT * FROM enquiries WHERE 1=1';
  const params: any[] = [];
  if (search) {
    query += ' AND (student_name ILIKE ? OR mobile ILIKE ? OR course_interested ILIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC';
  const items = await db.prepare(query).all(...params);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.student_name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  const db = getDb();
  const result = await db
    .prepare(
      `INSERT INTO enquiries (student_name, mobile, course_interested, qualification, address, enquiry_date, follow_up_date, status, remarks)
       VALUES (@student_name, @mobile, @course_interested, @qualification, @address, @enquiry_date, @follow_up_date, @status, @remarks)`
    )
    .run({
      student_name: data.student_name,
      mobile: data.mobile || null,
      course_interested: data.course_interested || null,
      qualification: data.qualification || null,
      address: data.address || null,
      enquiry_date: data.enquiry_date || null,
      follow_up_date: data.follow_up_date || null,
      status: data.status || 'Pending',
      remarks: data.remarks || null,
    });
  return NextResponse.json({ id: result.lastInsertRowid });
}
