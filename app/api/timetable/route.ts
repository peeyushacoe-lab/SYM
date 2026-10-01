import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';
import { getTimetable } from '@/lib/portal';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Two time ranges overlap if each starts before the other ends. A slot with
// no end_time is treated as a zero-length point at its start_time (the
// column has always allowed null end times) so it only conflicts with
// another range that actually covers that instant.
function timesOverlap(aStart: string, aEnd: string | null, bStart: string, bEnd: string | null) {
  const aE = aEnd || aStart;
  const bE = bEnd || bStart;
  return aStart < bE && bStart < aE;
}

export async function GET(req: NextRequest) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const batchId = req.nextUrl.searchParams.get('batch_id');
  const db = getDb();
  if (batchId) {
    // batch_id is a raw query param — confirm it belongs to this school
    // before returning its timetable (getTimetable() itself doesn't check).
    const batch = await db.prepare('SELECT id FROM batches WHERE id = ? AND school_id = ?').get(Number(batchId), auth.session.schoolId);
    if (!batch) return NextResponse.json({ error: 'Batch not found.' }, { status: 404 });
    return NextResponse.json({ items: await getTimetable(Number(batchId)) });
  }
  if (auth.session.role === 'teacher') {
    // All slots for the teacher's batches
    const items = await db
      .prepare(
        `SELECT t.*, u.name as teacher_name, b.name as batch_name FROM timetable_slots t
         LEFT JOIN users u ON t.teacher_user_id = u.id
         LEFT JOIN batches b ON t.batch_id = b.id
         WHERE t.school_id = ? AND t.batch_id IN (SELECT batch_id FROM teacher_batches WHERE teacher_user_id = ?)
         ORDER BY t.day, t.lecture_order NULLS LAST, t.start_time`
      )
      .all(auth.session.schoolId, auth.session.id);
    return NextResponse.json({ items });
  }
  const items = await db
    .prepare(
      `SELECT t.*, u.name as teacher_name, b.name as batch_name FROM timetable_slots t
       LEFT JOIN users u ON t.teacher_user_id = u.id
       LEFT JOIN batches b ON t.batch_id = b.id
       WHERE t.school_id = ?
       ORDER BY t.day, t.lecture_order NULLS LAST, t.start_time`
    )
    .all(auth.session.schoolId);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();

  // `days` (array) lets the create-slot wizard apply the same class to
  // several days at once (e.g. Mon/Wed/Fri); `day` (single number) still
  // works for any older caller.
  const days: number[] = Array.isArray(data.days)
    ? Array.from(new Set<number>(data.days.map((d: any) => Number(d))))
    : data.day !== undefined && data.day !== null
    ? [Number(data.day)]
    : [];

  if (!data.batch_id || !days.length || !data.start_time || !data.subject) {
    return NextResponse.json({ error: 'Batch, at least one day, start time and subject are required.' }, { status: 400 });
  }

  const db = getDb();
  const batchId = Number(data.batch_id);
  const teacherUserId = data.teacher_user_id ? Number(data.teacher_user_id) : null;
  const lectureOrder =
    data.lecture_order !== undefined && data.lecture_order !== '' && data.lecture_order !== null ? Number(data.lecture_order) : null;

  // Conflict check, per requested day: a batch can't be in two places at
  // once, and an instructor can't teach two classes at once — regardless of
  // subject, since "different subject, same batch/instructor, same time" is
  // exactly the same scheduling clash.
  const conflicts: string[] = [];
  for (const day of days) {
    // Note: when teacherUserId is null, "t.teacher_user_id = NULL" is never
    // true in SQL (comparisons against NULL evaluate to NULL, not true), so
    // the OR condition naturally reduces to just the batch_id match — no
    // need for a separate "is not null" guard.
    const candidates = (await db
      .prepare(
        `SELECT t.*, b.name as batch_name, u.name as teacher_name FROM timetable_slots t
         LEFT JOIN batches b ON t.batch_id = b.id
         LEFT JOIN users u ON t.teacher_user_id = u.id
         WHERE t.school_id = ? AND t.day = ? AND (t.batch_id = ? OR t.teacher_user_id = ?)`
      )
      .all(auth.session.schoolId, day, batchId, teacherUserId)) as any[];

    for (const c of candidates) {
      if (!timesOverlap(data.start_time, data.end_time || null, c.start_time, c.end_time)) continue;
      const dayName = DAY_NAMES[day] ?? `Day ${day}`;
      const timeLabel = `${c.start_time}${c.end_time ? `-${c.end_time}` : ''}`;
      if (c.batch_id === batchId) {
        conflicts.push(`${dayName} ${timeLabel}: ${c.batch_name} already has ${c.subject}${c.teacher_name ? ` with ${c.teacher_name}` : ''}`);
      } else {
        conflicts.push(`${dayName} ${timeLabel}: ${c.teacher_name || 'This instructor'} is already teaching ${c.subject} (${c.batch_name})`);
      }
    }
  }

  if (conflicts.length) {
    return NextResponse.json({ error: `Schedule conflict — ${conflicts.join('; ')}` }, { status: 409 });
  }

  const ids: number[] = [];
  for (const day of days) {
    const result = await db
      .prepare(
        'INSERT INTO timetable_slots (batch_id, day, start_time, end_time, subject, teacher_user_id, lecture_order, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(batchId, day, data.start_time, data.end_time || null, data.subject, teacherUserId, lectureOrder, auth.session.schoolId);
    ids.push(result.lastInsertRowid as number);
  }
  return NextResponse.json({ id: ids[0], ids });
}
