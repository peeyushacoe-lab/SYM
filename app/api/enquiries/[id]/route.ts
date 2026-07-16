import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();
  await db.prepare(
    `UPDATE enquiries SET student_name=@student_name, mobile=@mobile, course_interested=@course_interested,
     qualification=@qualification, address=@address, enquiry_date=@enquiry_date, follow_up_date=@follow_up_date,
     status=@status, remarks=@remarks WHERE id=@id`
  ).run({
    id: params.id,
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
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  await db.prepare('DELETE FROM enquiries WHERE id=?').run(params.id);
  return NextResponse.json({ ok: true });
}
