'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/Badge';
import { gradeFor } from '@/components/portal/ResultsSection';

function Bar({ pct, tone = 'tertiary' }: { pct: number; tone?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color =
    clamped >= 70 ? 'bg-accent' : clamped >= 40 ? 'bg-tertiary' : 'bg-danger';
  return (
    <div className="h-1.5 w-full bg-surface-container-low rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export default function PerformanceAnalyticsPage() {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/analytics/performance')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="text-sm text-on-surface-variant">Loading...</div>;

  const { overall, batchWise, subjectWise, examTrend, topPerformers, needsAttention } = data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">Performance analytics</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Academic performance trends across batches, subjects and students
        </p>
      </div>

      {overall.gradedCount === 0 ? (
        <div className="card text-sm text-on-surface-variant">
          No graded exam results yet. Add exam marks to see performance analytics.
        </div>
      ) : (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="card !py-3">
              <div className="text-[11px] uppercase text-on-surface-variant">Overall average</div>
              <div className="text-xl font-semibold text-on-surface mt-1">
                {overall.avgPct !== null ? `${overall.avgPct}%` : '-'}
              </div>
            </div>
            <div className="card !py-3">
              <div className="text-[11px] uppercase text-on-surface-variant">Pass rate</div>
              <div className={`text-xl font-semibold mt-1 ${overall.passRate !== null && overall.passRate < 60 ? 'text-danger' : 'text-accent'}`}>
                {overall.passRate !== null ? `${overall.passRate}%` : '-'}
              </div>
            </div>
            <div className="card !py-3">
              <div className="text-[11px] uppercase text-on-surface-variant">Graded results</div>
              <div className="text-xl font-semibold text-on-surface mt-1">{overall.gradedCount}</div>
            </div>
          </div>

          {/* Batch-wise performance */}
          <div className="card">
            <div className="text-[13px] font-semibold text-on-surface mb-3">Batch-wise average performance</div>
            {batchWise.length === 0 ? (
              <div className="text-sm text-on-surface-variant">No data yet.</div>
            ) : (
              <div className="space-y-3">
                {batchWise.map((b: any) => (
                  <div key={b.batch_id ?? b.batch_name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-on-surface">{b.batch_name || 'No batch'}</span>
                      <span className="text-on-surface-variant text-xs">{b.avg_pct}% · {b.graded_count} results</span>
                    </div>
                    <Bar pct={b.avg_pct || 0} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subject-wise performance */}
          <div className="card">
            <div className="text-[13px] font-semibold text-on-surface mb-3">Subject-wise average performance</div>
            {subjectWise.length === 0 ? (
              <div className="text-sm text-on-surface-variant">No data yet.</div>
            ) : (
              <div className="space-y-3">
                {subjectWise.map((s: any) => (
                  <div key={s.subject} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-on-surface">{s.subject}</span>
                      <span className="text-on-surface-variant text-xs">{s.avg_pct}% · {s.graded_count} results</span>
                    </div>
                    <Bar pct={s.avg_pct || 0} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exam trend */}
          <div className="card p-0 overflow-x-auto">
            <div className="px-4 py-3 border-b border-outline-variant/30 text-[13px] font-semibold text-on-surface">
              Recent exam trend
            </div>
            {examTrend.length === 0 ? (
              <div className="px-4 py-6 text-sm text-on-surface-variant">No exams graded yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-on-surface-variant uppercase tracking-wide">
                    <th className="px-4 py-2">Exam</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Avg %</th>
                    <th className="px-4 py-2">Results</th>
                  </tr>
                </thead>
                <tbody>
                  {examTrend.map((e: any) => (
                    <tr key={e.exam_id} className="border-t border-outline-variant/25">
                      <td className="px-4 py-2">{e.exam_name}</td>
                      <td className="px-4 py-2 text-on-surface-variant">{e.exam_date || '-'}</td>
                      <td className="px-4 py-2 font-medium">{e.avg_pct}%</td>
                      <td className="px-4 py-2 text-on-surface-variant">{e.graded_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Top performers / needs attention */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-0">
              <div className="px-4 py-3 border-b border-outline-variant/30 text-[13px] font-semibold text-on-surface">
                Top performers
              </div>
              <div className="divide-y divide-outline-variant/25">
                {topPerformers.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-on-surface-variant">No data yet.</div>
                ) : (
                  topPerformers.map((s: any) => {
                    const g = gradeFor(s.avg_pct);
                    return (
                      <Link
                        key={s.student_id}
                        href={`/students/${s.student_id}`}
                        className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-surface-container-low/50"
                      >
                        <div>
                          <div className="text-sm font-medium text-on-surface">{s.student_name}</div>
                          <div className="text-xs text-on-surface-variant">{s.batch_name || '-'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-on-surface">{s.avg_pct}%</span>
                          <Badge tone={g.tone}>{g.grade}</Badge>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            <div className="card p-0">
              <div className="px-4 py-3 border-b border-outline-variant/30 text-[13px] font-semibold text-on-surface">
                Needs attention
              </div>
              <div className="divide-y divide-outline-variant/25">
                {needsAttention.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-on-surface-variant">No students below passing average.</div>
                ) : (
                  needsAttention.map((s: any) => {
                    const g = gradeFor(s.avg_pct);
                    return (
                      <Link
                        key={s.student_id}
                        href={`/students/${s.student_id}`}
                        className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-surface-container-low/50"
                      >
                        <div>
                          <div className="text-sm font-medium text-on-surface">{s.student_name}</div>
                          <div className="text-xs text-on-surface-variant">{s.batch_name || '-'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-danger">{s.avg_pct}%</span>
                          <Badge tone={g.tone}>{g.grade}</Badge>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
