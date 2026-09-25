'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';

// Exam list + create form. Shared by teacher and management.
// batches: options for the create form (teacher: own batches; management: all).
export default function ExamsPanel({
  detailBase,
  batchFilter,
  allowCourse = true,
}: {
  detailBase: string;
  batchFilter?: number | string;
  // Course-based exams are management-only (server-enforced too) — the
  // teacher's own exams page passes false so the option isn't offered only
  // to be rejected.
  allowCourse?: boolean;
}) {
  const [exams, setExams] = useState<any[] | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [target, setTarget] = useState<'batch' | 'course'>('batch');
  const [form, setForm] = useState({ name: '', batch_id: '', course: '', subject: '', exam_date: '', max_marks: '100' });

  function load() {
    const url = batchFilter ? `/api/exams?batch_id=${batchFilter}` : '/api/exams';
    fetch(url)
      .then((r) => r.json())
      .then((d) => setExams(d.items || []));
  }

  useEffect(() => {
    load();
    fetch('/api/teacher/batches')
      .then((r) => (r.ok ? r.json() : fetch('/api/batches').then((r2) => r2.json())))
      .then((d) => setBatches(d.items || []));
    fetch('/api/courses')
      .then((r) => r.json())
      .then((d) => setCourseOptions((d.items || []).map((c: any) => c.name)));
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((d) => setSubjectOptions((d.items || []).map((s: any) => s.name)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchFilter]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        batch_id: target === 'batch' ? Number(batchFilter || form.batch_id) : null,
        course: target === 'course' ? form.course : null,
        max_marks: Number(form.max_marks) || 100,
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) return setError(d.error || 'Failed to create exam.');
    setModal(false);
    setForm({ name: '', batch_id: '', course: '', subject: '', exam_date: '', max_marks: '100' });
    load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this exam and all its marks?')) return;
    await fetch(`/api/exams/${id}`, { method: 'DELETE' });
    load();
  }

  if (!exams) return <div className="text-sm text-textSecondary">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-text">Exams</div>
        <button onClick={() => { setModal(true); setError(''); }} className="btn btn-primary !py-1.5 !px-3 text-xs">
          Create exam
        </button>
      </div>

      {exams.length === 0 ? (
        <div className="card text-sm text-textSecondary">No exams yet. Create one to start entering marks.</div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Exam</th>
                <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Batch</th>
                <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Subject</th>
                <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Date</th>
                <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Max marks</th>
                <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Progress</th>
                <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id} className="border-b border-borderLight last:border-0">
                  <td className="px-4 py-2.5 font-medium text-text">{e.name}</td>
                  <td className="px-4 py-2.5">{e.batch_name || (e.course ? `Course: ${e.course}` : '-')}</td>
                  <td className="px-4 py-2.5">{e.subject || '-'}</td>
                  <td className="px-4 py-2.5">{e.exam_date || '-'}</td>
                  <td className="px-4 py-2.5">{e.max_marks}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${e.marks_entered >= e.student_count && e.student_count > 0 ? 'badge-green' : 'badge-amber'}`}>
                      {e.marks_entered}/{e.student_count} marked
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <Link href={`${detailBase}/${e.id}`} className="btn btn-primary !py-1 !px-2.5 text-xs mr-1.5">
                      Enter marks
                    </Link>
                    <button onClick={() => remove(e.id)} className="btn btn-outline !py-1 !px-2.5 text-xs text-danger">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Create exam">
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="text-sm text-danger">{error}</div>}
          <div>
            <label className="label">Exam name</label>
            <input
              className="input"
              required
              placeholder="e.g. Unit Test 1"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          {!batchFilter && (
            <>
              {allowCourse && (
                <div>
                  <label className="label">Target</label>
                  <select
                    className="input"
                    value={target}
                    onChange={(e) => setTarget(e.target.value as 'batch' | 'course')}
                  >
                    <option value="batch">Batch</option>
                    <option value="course">Course</option>
                  </select>
                </div>
              )}
              {target === 'batch' ? (
                <div>
                  <label className="label">Batch</label>
                  <select
                    className="input"
                    required
                    value={form.batch_id}
                    onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                  >
                    <option value="">Select batch</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="label">Course</label>
                  <select
                    className="input"
                    required
                    value={form.course}
                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                  >
                    <option value="">Select course</option>
                    {courseOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-textSecondary mt-1">Shows every student enrolled directly in this course (not via a batch).</p>
                </div>
              )}
            </>
          )}
          <div className="flex flex-wrap -mx-1.5">
            <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
              <label className="label">Subject</label>
              <select className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                <option value="">Select subject</option>
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
              <label className="label">Exam date</label>
              <input
                type="date"
                className="input"
                value={form.exam_date}
                onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Maximum marks</label>
            <input
              type="number"
              min={1}
              className="input"
              value={form.max_marks}
              onChange={(e) => setForm({ ...form, max_marks: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
