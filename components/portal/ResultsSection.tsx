'use client';

import { useEffect, useState } from 'react';
import Badge from '@/components/Badge';

export function gradeFor(pct: number): { grade: string; tone: 'green' | 'blue' | 'amber' | 'red' } {
  if (pct >= 90) return { grade: 'A+', tone: 'green' };
  if (pct >= 80) return { grade: 'A', tone: 'green' };
  if (pct >= 70) return { grade: 'B+', tone: 'blue' };
  if (pct >= 60) return { grade: 'B', tone: 'blue' };
  if (pct >= 50) return { grade: 'C', tone: 'amber' };
  if (pct >= 40) return { grade: 'D', tone: 'amber' };
  return { grade: 'F', tone: 'red' };
}

export default function ResultsSection({ studentKey }: { studentKey: string }) {
  const [results, setResults] = useState<any[] | null>(null);

  useEffect(() => {
    fetch(`/api/portal/${studentKey}?section=results`)
      .then((r) => r.json())
      .then((d) => setResults(d.results || []));
  }, [studentKey]);

  if (!results) return <div className="text-sm text-textSecondary">Loading...</div>;

  const graded = results.filter((r) => r.marks !== null && r.marks !== undefined);
  const avgPct = graded.length
    ? Math.round(graded.reduce((s, r) => s + (r.marks / (r.max_marks || 100)) * 100, 0) / graded.length)
    : null;
  const best = graded.length
    ? graded.reduce((a, b) => ((a.marks / (a.max_marks || 100)) > (b.marks / (b.max_marks || 100)) ? a : b))
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card !py-3">
          <div className="text-[11px] uppercase text-textSecondary">Exams taken</div>
          <div className="text-xl font-semibold text-text mt-1">{graded.length}</div>
        </div>
        <div className="card !py-3">
          <div className="text-[11px] uppercase text-textSecondary">Average score</div>
          <div className="text-xl font-semibold text-text mt-1">{avgPct !== null ? `${avgPct}%` : '-'}</div>
        </div>
        <div className="card !py-3">
          <div className="text-[11px] uppercase text-textSecondary">Best exam</div>
          <div className="text-sm font-semibold text-text mt-1.5 truncate">{best ? best.name : '-'}</div>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <div className="px-4 py-3 border-b border-border text-[13px] font-semibold text-text">Exam results</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Exam</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Subject</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Date</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Marks</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Grade</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-textSecondary">
                  No exams scheduled yet.
                </td>
              </tr>
            ) : (
              results.map((r) => {
                const hasMarks = r.marks !== null && r.marks !== undefined;
                const pct = hasMarks ? Math.round((r.marks / (r.max_marks || 100)) * 100) : null;
                const g = pct !== null ? gradeFor(pct) : null;
                return (
                  <tr key={r.exam_id} className="border-b border-borderLight last:border-0">
                    <td className="px-4 py-2.5 font-medium text-text">{r.name}</td>
                    <td className="px-4 py-2.5">{r.subject || '-'}</td>
                    <td className="px-4 py-2.5">{r.exam_date || '-'}</td>
                    <td className="px-4 py-2.5">
                      {hasMarks ? `${r.marks} / ${r.max_marks || 100} (${pct}%)` : 'Awaited'}
                    </td>
                    <td className="px-4 py-2.5">{g ? <Badge tone={g.tone}>{g.grade}</Badge> : '-'}</td>
                    <td className="px-4 py-2.5 text-textSecondary">{r.remarks || '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
