import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

// Approve / reject a leave request (management, or teacher of the student's batch)
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const params = await props.params;
  const db = getDb();

  const leave = (await db
    .prepare('SELECT l.*, s.batch_id FROM leave_requests l JOIN students s ON l.student_id = s.id WHERE l.id = ?')
    .get(params.id)) as any;
  if (!leave) return NextResponse.json({ error: 'Leave request not found.' }, { status: 404 });

  if (auth.session.role === 'teacher') {
    const owns = await db
      .prepare('SELECT 1 FROM teacher_batches WHERE teacher_user_id = ? AND batch_id = ?')
      .get(auth.session.id, leave.batch_id);
    if (!owns) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const data = await req.json();
  if (!['Approved', 'Rejected', 'Pending'].includes(data.status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }

  await db
    .prepare(
      `UPDATE leave_requests SET status = ?, response_note = ?, responded_by = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
    .run(data.status, data.response_note || null, auth.session.id, params.id);
  return NextResponse.json({ ok: true });
}
