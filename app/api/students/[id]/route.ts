import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const item = db
    .prepare(`SELECT s.*, b.name as batch_name FROM students s LEFT JOIN batches b ON s.batch_id = b.id WHERE s.id = ?`)
    .get(params.id);
  if (!item) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();
  db.prepare(
    `UPDATE students SET name=@name, father_name=@father_name, mother_name=@mother_name, mobile=@mobile,
     alt_mobile=@alt_mobile, address=@address, dob=@dob, gender=@gender, qualification=@qualification,
     course=@course, batch_id=@batch_id, admission_date=@admission_date, roll_number=@roll_number,
     registration_number=@registration_number, aadhaar=@aadhaar, photo=@photo, email=@email, remarks=@remarks
     WHERE id=@id`
  ).run({
    id: params.id,
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
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  db.prepare('DELETE FROM fees WHERE student_id=?').run(params.id);
  db.prepare('DELETE FROM attendance WHERE student_id=?').run(params.id);
  db.prepare('DELETE FROM student_guardians WHERE student_id=?').run(params.id);
  db.prepare('DELETE FROM students WHERE id=?').run(params.id);
  return NextResponse.json({ ok: true });
}
