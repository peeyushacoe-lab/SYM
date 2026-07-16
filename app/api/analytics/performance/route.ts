import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { requireRole } from '@/lib/api-auth';

const PASS_PCT = 40;

export async function GET() {
  const auth = await requireRole('management', 'teacher');
  if ('error' in auth) return auth.error;
  const db = getDb();

  // Scope teachers to their own batches; management sees everything.
  const teacherFilter =
    auth.session.role === 'teacher'
      ? 'AND s.batch_id IN (SELECT batch_id FROM teacher_batches WHERE teacher_id = ?)'
      : '';
  const teacherParams = auth.session.role === 'teacher' ? [auth.session.id] : [];

  const baseFrom = `
    FROM exam_marks m
    JOIN exams e ON m.exam_id = e.id
    JOIN students s ON m.student_id = s.id
    LEFT JOIN batches b ON s.batch_id = b.id
    WHERE m.marks IS NOT NULL AND e.max_marks > 0
    ${teacherFilter}
  `;

  const overallRow = await db
    .prepare(
      `SELECT
        COUNT(*) as graded_count,
        AVG(m.marks / e.max_marks * 100) as avg_pct,
        SUM(CASE WHEN m.marks / e.max_marks * 100 >= ${PASS_PCT} THEN 1 ELSE 0 END) as pass_count
      ${baseFrom}`
    )
    .get(...teacherParams) as any;

  const overall = {
    gradedCount: Number(overallRow?.graded_count || 0),
    avgPct: overallRow?.avg_pct !== null ? Math.round(Number(overallRow.avg_pct)) : null,
    passRate:
      overallRow?.graded_count > 0
        ? Math.round((Number(overallRow.pass_count) / Number(overallRow.graded_count)) * 100)
        : null,
  };

  const batchWise = await db
    .prepare(
      `SELECT b.id as batch_id, b.name as batch_name,
        COUNT(*) as graded_count,
        AVG(m.marks / e.max_marks * 100) as avg_pct
      ${baseFrom}
      GROUP BY b.id, b.name
      ORDER BY avg_pct DESC`
    )
    .all(...teacherParams);

  const subjectWise = await db
    .prepare(
      `SELECT COALESCE(e.subject, 'General') as subject,
        COUNT(*) as graded_count,
        AVG(m.marks / e.max_marks * 100) as avg_pct
      ${baseFrom}
      GROUP BY e.subject
      ORDER BY avg_pct DESC`
    )
    .all(...teacherParams);

  const examTrend = await db
    .prepare(
      `SELECT e.id as exam_id, e.name as exam_name, e.exam_date,
        AVG(m.marks / e.max_marks * 100) as avg_pct,
        COUNT(*) as graded_count
      ${baseFrom}
      GROUP BY e.id, e.name, e.exam_date
      ORDER BY e.exam_date DESC NULLS LAST, e.id DESC
      LIMIT 10`
    )
    .all(...teacherParams);

  const studentWise = await db
    .prepare(
      `SELECT s.id as student_id, s.name as student_name, b.name as batch_name,
        COUNT(*) as graded_count,
        AVG(m.marks / e.max_marks * 100) as avg_pct
      ${baseFrom}
      GROUP BY s.id, s.name, b.name
      HAVING COUNT(*) >= 1`
    )
    .all(...teacherParams);

  const ranked = (studentWise as any[])
    .map((s) => ({ ...s, avg_pct: s.avg_pct !== null ? Math.round(Number(s.avg_pct)) : null }))
    .filter((s) => s.avg_pct !== null);

  const topPerformers = [...ranked].sort((a, b) => b.avg_pct - a.avg_pct).slice(0, 10);
  const needsAttention = [...ranked]
    .filter((s) => s.avg_pct < PASS_PCT)
    .sort((a, b) => a.avg_pct - b.avg_pct)
    .slice(0, 10);

  return NextResponse.json({
    overall,
    batchWise: (batchWise as any[]).map((r) => ({ ...r, avg_pct: r.avg_pct !== null ? Math.round(Number(r.avg_pct)) : null })),
    subjectWise: (subjectWise as any[]).map((r) => ({ ...r, avg_pct: r.avg_pct !== null ? Math.round(Number(r.avg_pct)) : null })),
    examTrend: (examTrend as any[])
      .map((r) => ({ ...r, avg_pct: r.avg_pct !== null ? Math.round(Number(r.avg_pct)) : null }))
      .reverse(),
    topPerformers,
    needsAttention,
  });
}
