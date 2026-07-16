import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  const auth = await requireRole('teacher');
  if ('error' in auth) return auth.error;
  const data = await req.json();
  const { batch_id, date, records } = data;
  if (!batch_id || !date || !Array.isArray(records)) {
    return NextResponse.json({ error: 'batch_id, date and records are required.' }, { status: 400 });
  }

  const db = getDb();
  const owns = await db
    .prepare('SELECT 1 FROM teacher_batches WHERE teacher_user_id = ? AND batch_id = ?')
    .get(auth.session.id, batch_id);
  if (!owns) return NextResponse.json({ error: 'Not authorized for this batch.' }, { status: 403 });

  const stmt = db.prepare(
    `INSERT INTO attendance (batch_id, student_id, date, status, marked_by) VALUES (@batch_id, @student_id, @date, @status, @marked_by)
     ON CONFLICT(batch_id, student_id, date) DO UPDATE SET status = excluded.status, marked_by = excluded.marked_by`
  );
  const tx = db.transaction(async (recs: any[]) => {
    for (const r of recs) {
      await stmt.run({ batch_id, student_id: r.student_id, date, status: r.status, marked_by: auth.session.id });
    }
  });
  await tx(records);

  return NextResponse.json({ ok: true });
}
