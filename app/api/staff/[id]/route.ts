import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();
  db.prepare(
    'UPDATE staff SET name=@name, mobile=@mobile, designation=@designation, salary=@salary, joining_date=@joining_date, address=@address, remarks=@remarks WHERE id=@id'
  ).run({
    id: params.id,
    name: data.name,
    mobile: data.mobile || null,
    designation: data.designation || null,
    salary: data.salary || 0,
    joining_date: data.joining_date || null,
    address: data.address || null,
    remarks: data.remarks || null,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  db.prepare('DELETE FROM staff WHERE id=?').run(params.id);
  return NextResponse.json({ ok: true });
}
