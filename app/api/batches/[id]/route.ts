import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();
  db.prepare(
    'UPDATE batches SET name=@name, course=@course, start_date=@start_date, end_date=@end_date, timing=@timing, capacity=@capacity, remarks=@remarks WHERE id=@id'
  ).run({
    id: params.id,
    name: data.name,
    course: data.course || null,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    timing: data.timing || null,
    capacity: data.capacity || 30,
    remarks: data.remarks || null,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  db.prepare('DELETE FROM teacher_batches WHERE batch_id=?').run(params.id);
  db.prepare('UPDATE students SET batch_id=NULL WHERE batch_id=?').run(params.id);
  db.prepare('DELETE FROM batches WHERE id=?').run(params.id);
  return NextResponse.json({ ok: true });
}
