import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

// POST { batch_id, slots: [{ day, start_time, end_time, subject, teacher_user_id }] }
// Used by the "Paste timetable" text-import tool — inserts every parsed slot
// for one batch in a single request. Purely additive, same as adding slots
// one at a time through the regular form; existing slots are untouched.
export async function POST(req: NextRequest) {
  const auth = await requireRole('management');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const db = getDb();

  if (!data.batch_id) return NextResponse.json({ error: 'Batch is required.' }, { status: 400 });
  const batch = await db.prepare('SELECT id FROM batches WHERE id = ? AND school_id = ?').get(data.batch_id, auth.session.schoolId);
  if (!batch) return NextResponse.json({ error: 'Batch not found.' }, { status: 404 });

  const slots = Array.isArray(data.slots) ? data.slots : [];
  if (!slots.length) return NextResponse.json({ error: 'No slots to add.' }, { status: 400 });

  let inserted = 0;
  for (const s of slots) {
    if (s.day === undefined || s.day === null || !s.start_time || !s.subject) continue;
    await db
      .prepare(
        'INSERT INTO timetable_slots (batch_id, day, start_time, end_time, subject, teacher_user_id, school_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(data.batch_id, Number(s.day), s.start_time, s.end_time || null, s.subject, s.teacher_user_id || null, auth.session.schoolId);
    inserted += 1;
  }

  return NextResponse.json({ ok: true, inserted });
}
