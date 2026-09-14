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
    'UPDATE batches SET name=@name, course=@course, start_date=@start_date, end_date=@end_date, timing=@timing, capacity=@capacity, remarks=@remarks, advance_fee=@advance_fee, monthly_fee=@monthly_fee WHERE id=@id'
  ).run({
    id: params.id,
    name: data.name,
    course: data.course || null,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    timing: data.timing || null,
    capacity: data.capacity || 30,
    remarks: data.remarks || null,
    advance_fee: Number(data.advance_fee) ? 1 : 0,
    monthly_fee: Number(data.monthly_fee) || 0,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const db = getDb();
  // Every other table with a NOT NULL, non-cascading FK to batches(id) must
  // be cleared first, or Postgres throws a raw FK-violation 500 the moment
  // the batch has any attendance, exams, timetable, homework, or lesson plans.
  await db.prepare('DELETE FROM teacher_batches WHERE batch_id=?').run(params.id);
  await db.prepare('UPDATE students SET batch_id=NULL WHERE batch_id=?').run(params.id);
  await db.prepare('DELETE FROM attendance WHERE batch_id=?').run(params.id);
  await db.prepare('DELETE FROM exam_marks WHERE exam_id IN (SELECT id FROM exams WHERE batch_id=?)').run(params.id);
  await db.prepare('DELETE FROM exams WHERE batch_id=?').run(params.id);
  await db.prepare('DELETE FROM timetable_slots WHERE batch_id=?').run(params.id);
  await db.prepare('DELETE FROM homework WHERE batch_id=?').run(params.id);
  await db.prepare('DELETE FROM lesson_plans WHERE batch_id=?').run(params.id);
  await db.prepare('DELETE FROM batches WHERE id=?').run(params.id);
  return NextResponse.json({ ok: true });
}
