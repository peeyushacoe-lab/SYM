import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { getTimetable } from '@/lib/portal';

export async function GET(req: NextRequest) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const batchId = req.nextUrl.searchParams.get('batch_id');
  if (batchId) {
    return NextResponse.json({ items: getTimetable(Number(batchId)) });
  }
  const db = getDb();
  if (auth.session.role === 'teacher') {
    // All slots for the teacher's batches
    const items = db
      .prepare(
        `SELECT t.*, u.name as teacher_name, b.name as batch_name FROM timetable_slots t
         LEFT JOIN users u ON t.teacher_user_id = u.id
         LEFT JOIN batches b ON t.batch_id = b.id
         WHERE t.batch_id IN (SELECT batch_id FROM teacher_batches WHERE teacher_user_id = ?)
         ORDER BY t.day, t.start_time`
      )
      .all(auth.session.id);
    return NextResponse.json({ items });
  }
  const items = db
    .prepare(
      `SELECT t.*, u.name as teacher_name, b.name as batch_name FROM timetable_slots t
       LEFT JOIN users u ON t.teacher_user_id = u.id
       LEFT JOIN batches b ON t.batch_id = b.id
       ORDER BY t.day, t.start_time`
    )
    .all();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  if (!data.batch_id || data.day === undefined || !data.start_time || !data.subject) {
    return NextResponse.json({ error: 'Batch, day, start time and subject are required.' }, { status: 400 });
  }
  const db = getDb();
  const result = db
    .prepare(
      'INSERT INTO timetable_slots (batch_id, day, start_time, end_time, subject, teacher_user_id) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(data.batch_id, data.day, data.start_time, data.end_time || null, data.subject, data.teacher_user_id || null);
  return NextResponse.json({ id: result.lastInsertRowid });
}
