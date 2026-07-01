import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;

  const search = req.nextUrl.searchParams.get('search') || '';
  const db = getDb();
  const items = search
    ? db
        .prepare(
          `SELECT s.*, b.name as batch_name FROM students s
           LEFT JOIN batches b ON s.batch_id = b.id
           WHERE s.name LIKE ? OR s.mobile LIKE ? OR s.roll_number LIKE ? OR s.registration_number LIKE ? OR s.course LIKE ?
           ORDER BY s.name`
        )
        .all(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    : db
        .prepare(
          `SELECT s.*, b.name as batch_name FROM students s LEFT JOIN batches b ON s.batch_id = b.id ORDER BY s.name`
        )
        .all();

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
  const result = db
    .prepare(
      `INSERT INTO students (name, father_name, mother_name, mobile, alt_mobile, address, dob, gender,
        qualification, course, batch_id, admission_date, roll_number, registration_number,
        aadhaar, photo, email, remarks)
       VALUES (@name, @father_name, @mother_name, @mobile, @alt_mobile, @address, @dob, @gender,
        @qualification, @course, @batch_id, @admission_date, @roll_number, @registration_number,
        @aadhaar, @photo, @email, @remarks)`
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
    });

  return NextResponse.json({ id: result.lastInsertRowid });
}
