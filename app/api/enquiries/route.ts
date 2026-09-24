import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const search = req.nextUrl.searchParams.get('search') || '';
  const status = req.nextUrl.searchParams.get('status') || '';
  const db = getDb();
  let query = 'SELECT * FROM enquiries WHERE school_id = ?';
  const params: any[] = [auth.session.schoolId];
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
  // Tufee behaviour: follow-up defaults to enquiry date + 5 days when not given
  const enquiryDate = data.enquiry_date || new Date().toISOString().slice(0, 10);
  let followUp = data.follow_up_date;
  if (!followUp) {
    const d = new Date(enquiryDate + 'T00:00:00');
    d.setDate(d.getDate() + 5);
    followUp = d.toISOString().slice(0, 10);
  }
  const result = await db
    .prepare(
      `INSERT INTO enquiries (student_name, mobile, course_interested, qualification, address, enquiry_date, follow_up_date, status, remarks, school_id)
       VALUES (@student_name, @mobile, @course_interested, @qualification, @address, @enquiry_date, @follow_up_date, @status, @remarks, @school_id)`
    )
    .run({
      student_name: data.student_name,
      mobile: data.mobile || null,
      course_interested: data.course_interested || null,
      qualification: data.qualification || null,
      address: data.address || null,
      enquiry_date: enquiryDate,
      follow_up_date: followUp,
      status: data.status || 'Pending',
      remarks: data.remarks || null,
      school_id: auth.session.schoolId,
    });
  return NextResponse.json({ id: result.lastInsertRowid });
}
