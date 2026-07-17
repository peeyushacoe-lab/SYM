import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;

  const search = req.nextUrl.searchParams.get('search') || '';
  const batchId = req.nextUrl.searchParams.get('batch_id') || '';
  const course = req.nextUrl.searchParams.get('course') || '';
  const db = getDb();
  let query = `SELECT s.*, b.name as batch_name FROM students s LEFT JOIN batches b ON s.batch_id = b.id WHERE 1=1`;
  const params: any[] = [];
  if (search) {
    query += ` AND (s.name ILIKE ? OR s.mobile ILIKE ? OR s.roll_number ILIKE ? OR s.registration_number ILIKE ? OR s.course ILIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (batchId) {
    query += ' AND s.batch_id = ?';
    params.push(batchId);
  }
  if (course) {
    query += ' AND s.course = ?';
    params.push(course);
  }
  query += ' ORDER BY s.name';
  const items = await db.prepare(query).all(...params);

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;

  const data = await req.json();
  if (!data.name || !data.mobile) {
    return NextResponse.json({ error: 'Name and mobile are required.' }, { status: 400 });
  }

  const db = getDb();
  const result = await db
    .prepare(
      `INSERT INTO students (name, father_name, mother_name, mobile, alt_mobile, address, dob, gender,
        qualification, course, batch_id, admission_date, roll_number, registration_number,
        aadhaar, photo, email, remarks, fee_category, fee_type, fee_amount)
       VALUES (@name, @father_name, @mother_name, @mobile, @alt_mobile, @address, @dob, @gender,
        @qualification, @course, @batch_id, @admission_date, @roll_number, @registration_number,
        @aadhaar, @photo, @email, @remarks, @fee_category, @fee_type, @fee_amount)`
    )
    .run({
      name: data.name,
      father_name: data.father_name || null,
      mother_name: data.mother_name || null,
      mobile: data.mobile,
      alt_mobile: data.alt_mobile || null,
      address: data.address || null,
      dob: data.dob || null,
      gender: data.gender || null,
      qualification: data.qualification || null,
      course: data.course || null,
      batch_id: data.batch_id || null,
      admission_date: data.admission_date || null,
      roll_number: data.roll_number || null,
      registration_number: data.registration_number || null,
      aadhaar: data.aadhaar || null,
      photo: data.photo || null,
      email: data.email || null,
      remarks: data.remarks || null,
      fee_category: data.fee_category || 'Default',
      fee_type: data.fee_type || 'CourseWise',
      fee_amount: data.fee_category === 'Custom' && data.fee_amount ? Number(data.fee_amount) : null,
    });

  return NextResponse.json({ id: result.lastInsertRowid });
}
