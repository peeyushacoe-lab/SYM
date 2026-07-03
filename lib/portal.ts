import getDb from './db';

// Shared read helpers for the student / guardian / teacher portals.

export function getStudentByUserId(userId: number) {
  const db = getDb();
  return db
    .prepare(
      `SELECT s.*, b.name as batch_name, b.timing, b.course as batch_course
       FROM students s LEFT JOIN batches b ON s.batch_id = b.id WHERE s.user_id = ?`
    )
    .get(userId) as any;
}

export function guardianOwnsStudent(guardianUserId: number, studentId: number | string): boolean {
  const db = getDb();
  return !!db
    .prepare('SELECT 1 FROM student_guardians WHERE guardian_user_id = ? AND student_id = ?')
    .get(guardianUserId, studentId);
}

export function getStudentProfile(studentId: number | string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT s.*, b.name as batch_name, b.timing, b.start_date as batch_start, b.end_date as batch_end,
              b.advance_fee as batch_advance_fee
       FROM students s LEFT JOIN batches b ON s.batch_id = b.id WHERE s.id = ?`
    )
    .get(studentId) as any;
}

export function getAttendanceSummary(studentId: number | string) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT status, COUNT(*) as count FROM attendance WHERE student_id = ? GROUP BY status`
    )
    .all(studentId) as { status: string; count: number }[];
  const total = rows.reduce((s, r) => s + r.count, 0);
  const present = rows.find((r) => r.status === 'Present')?.count || 0;
  const absent = rows.find((r) => r.status === 'Absent')?.count || 0;
  const leave = rows.find((r) => r.status === 'Leave')?.count || 0;
  return {
    total,
    present,
    absent,
    leave,
    pct: total ? Math.round((present / total) * 100) : null,
  };
}

// month: 'YYYY-MM'
export function getAttendanceMonth(studentId: number | string, month: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT date, status FROM attendance WHERE student_id = ? AND date LIKE ? ORDER BY date`
    )
    .all(studentId, `${month}-%`) as { date: string; status: string }[];
}

export function getResults(studentId: number | string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT e.id as exam_id, e.name, e.subject, e.exam_date, e.max_marks,
              m.marks, m.remarks
       FROM exams e
       JOIN students s ON s.batch_id = e.batch_id AND s.id = ?
       LEFT JOIN exam_marks m ON m.exam_id = e.id AND m.student_id = s.id
       ORDER BY e.exam_date DESC, e.id DESC`
    )
    .all(studentId) as any[];
}

export function getTimetable(batchId: number | null | undefined) {
  if (!batchId) return [];
  const db = getDb();
  return db
    .prepare(
      `SELECT t.*, u.name as teacher_name FROM timetable_slots t
       LEFT JOIN users u ON t.teacher_user_id = u.id
       WHERE t.batch_id = ? ORDER BY t.day, t.start_time`
    )
    .all(batchId) as any[];
}

export function getFees(studentId: number | string) {
  const db = getDb();
  const fees = db
    .prepare('SELECT * FROM fees WHERE student_id = ? ORDER BY payment_date DESC, id DESC')
    .all(studentId) as any[];
  const payments = db
    .prepare('SELECT * FROM payments WHERE student_id = ? ORDER BY created_at DESC')
    .all(studentId) as any[];
  return { fees, payments };
}

export function getLeaveRequests(studentId: number | string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT l.*, u.name as requested_by_name, r.name as responded_by_name
       FROM leave_requests l
       LEFT JOIN users u ON l.requested_by = u.id
       LEFT JOIN users r ON l.responded_by = r.id
       WHERE l.student_id = ? ORDER BY l.created_at DESC`
    )
    .all(studentId) as any[];
}

export function getQueries(raisedBy: number, studentId?: number | string) {
  const db = getDb();
  if (studentId) {
    return db
      .prepare(
        `SELECT q.*, r.name as responded_by_name FROM queries q
         LEFT JOIN users r ON q.responded_by = r.id
         WHERE q.raised_by = ? AND q.student_id = ? ORDER BY q.created_at DESC`
      )
      .all(raisedBy, studentId) as any[];
  }
  return db
    .prepare(
      `SELECT q.*, r.name as responded_by_name FROM queries q
       LEFT JOIN users r ON q.responded_by = r.id
       WHERE q.raised_by = ? ORDER BY q.created_at DESC`
    )
    .all(raisedBy) as any[];
}

export function teacherOwnsBatch(teacherUserId: number, batchId: number | string): boolean {
  const db = getDb();
  return !!db
    .prepare('SELECT 1 FROM teacher_batches WHERE teacher_user_id = ? AND batch_id = ?')
    .get(teacherUserId, batchId);
}

export function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}
