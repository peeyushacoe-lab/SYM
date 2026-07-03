'use client';

import { useEffect, useState } from 'react';
import { gradeFor } from './ResultsSection';
import Badge from '@/components/Badge';

// Marks entry sheet for one exam. Used by teacher & management.
export default function MarksEntry({ examId, onBack }: { examId: number | string; onBack?: () => void }) {
  const [exam, setExam] = useState<any | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/exams/${examId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return setError(d.error);
        setExam(d.exam);
        setRows(
          (d.students || []).map((s: any) => ({
            ...s,
            marks: s.marks ?? '',
            remarks: s.remarks ?? '',
          }))
        );
      });
  }, [examId]);

  function update(idx: number, field: 'marks' | 'remarks', value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError('');
    const res = await fetch(`/api/exams/${examId}/marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: rows.map((r) => ({ student_id: r.id, marks: r.marks === '' ? null : Number(r.marks), remarks: r.remarks || null })),
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) return setError(d.error || 'Failed to save marks.');
    setSaved(true);
  }

  if (error && !exam) return <div className="card text-sm text-danger">{error}</div>;
  if (!exam) return <div className="text-sm text-textSecondary">Loading...</div>;

  const max = exam.max_marks || 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="btn btn-outline !py-1 !px-2" aria-label="Back">
                <span className="material-symbols-outlined !text-[18px]">arrow_back</span>
              </button>
            )}
            <h2 className="text-lg font-semibold text-text">{exam.name}</h2>
          </div>
          <p className="text-xs text-textSecondary mt-0.5">
            {exam.batch_name} · {exam.subject || 'General'} · {exam.exam_date || 'Date not set'} · Max marks: {max}
          </p>
        </div>
        <button onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : 'Save marks'}
        </button>
      </div>

      {saved && (
        <div className="text-sm text-accent bg-accentLight border border-accentBorder rounded-lg px-3 py-2">
          Marks saved.
        </div>
      )}
      {error && <div className="text-sm text-danger">{error}</div>}

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Roll</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Student</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Marks (out of {max})</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Grade</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-textSecondary">
                  No students in this batch.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => {
                const pct = r.marks !== '' ? Math.round((Number(r.marks) / max) * 100) : null;
                const g = pct !== null && !isNaN(pct) ? gradeFor(pct) : null;
                return (
                  <tr key={r.id} className="border-b border-borderLight last:border-0">
                    <td className="px-4 py-2">{r.roll_number || '-'}</td>
                    <td className="px-4 py-2 font-medium text-text">{r.name}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        max={max}
                        className="input !py-1.5 w-24"
                        value={r.marks}
                        onChange={(e) => update(idx, 'marks', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">{g ? <Badge tone={g.tone}>{g.grade}</Badge> : '-'}</td>
                    <td className="px-4 py-2">
                      <input
                        className="input !py-1.5"
                        placeholder="Optional"
                        value={r.remarks}
                        onChange={(e) => update(idx, 'remarks', e.target.value)}
                      />
                    </td>
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
