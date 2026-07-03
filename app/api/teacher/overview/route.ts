import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRole('teacher');
  if ('error' in auth) return auth.error;
  const db = getDb();
  const id = auth.session.id;

  const batches = db
    .prepare(
      `SELECT b.*, (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id) as student_count
       FROM batches b JOIN teacher_batches tb ON tb.batch_id = b.id
       WHERE tb.teacher_user_id = ? ORDER BY b.name`
    )
    .all(id) as any[];

  const studentCount = batches.reduce((s, b) => s + (b.student_count || 0), 0);

  const pendingLeaves = (db
    .prepare(
      `SELECT COUNT(*) as c FROM leave_requests l JOIN students s ON l.student_id = s.id
       WHERE l.status = 'Pending' AND s.batch_id IN (SELECT batch_id FROM teacher_batches WHERE teacher_user_id = ?)`
    )
    .get(id) as any).c;

  const today = (new Date().getDay() + 6) % 7; // 0 = Monday
  const todaySlots = db
    .prepare(
      `SELECT t.*, b.name as batch_name FROM timetable_slots t
       JOIN batches b ON t.batch_id = b.id
       WHERE t.day = ? AND t.batch_id IN (SELECT batch_id FROM teacher_batches WHERE teacher_user_id = ?)
       ORDER BY t.start_time`
    )
    .all(today, id);

  const recentExams = db
    .prepare(
      `SELECT e.*, b.name as batch_name,
        (SELECT COUNT(*) FROM exam_marks m WHERE m.exam_id = e.id) as marks_entered,
        (SELECT COUNT(*) FROM students s WHERE s.batch_id = e.batch_id) as student_count
       FROM exams e JOIN batches b ON e.batch_id = b.id
       WHERE e.batch_id IN (SELECT batch_id FROM teacher_batches WHERE teacher_user_id = ?)
       ORDER BY e.exam_date DESC, e.id DESC LIMIT 5`
    )
    .all(id);

  return NextResponse.json({ batches, studentCount, pendingLeaves, todaySlots, recentExams });
}
