import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.name) return NextResponse.json({ error: 'Course name is required.' }, { status: 400 });
  const db = getDb();
  try {
    db.prepare('UPDATE courses SET name=@name, fee=@fee, duration=@duration, remarks=@remarks WHERE id=@id').run({
      id: params.id,
      name: String(data.name).trim(),
      fee: Number(data.fee) || 0,
      duration: data.duration || null,
      remarks: data.remarks || null,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e.message).includes('UNIQUE')) {
      return NextResponse.json({ error: 'A course with this name already exists.' }, { status: 400 });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  db.prepare('DELETE FROM courses WHERE id=?').run(params.id);
  return NextResponse.json({ ok: true });
}
