'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';

// Lesson plan list + create form. Shared by teacher and management.
export default function LessonPlanPanel({ batchFilter }: { batchFilter?: number | string }) {
  const [items, setItems] = useState<any[] | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ batch_id: '', subject: '', topic: '', description: '', planned_date: '' });

  function load() {
    const url = batchFilter ? `/api/lesson-plans?batch_id=${batchFilter}` : '/api/lesson-plans';
    fetch(url)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }

  useEffect(() => {
    load();
    fetch('/api/teacher/batches')
      .then((r) => (r.ok ? r.json() : fetch('/api/batches').then((r2) => r2.json())))
      .then((d) => setBatches(d.items || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchFilter]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/lesson-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, batch_id: Number(batchFilter || form.batch_id) }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) return setError(d.error || 'Failed to save lesson plan.');
    setModal(false);
    setForm({ batch_id: '', subject: '', topic: '', description: '', planned_date: '' });
    load();
  }

  async function toggleStatus(item: any) {
    const status = item.status === 'Completed' ? 'Planned' : 'Completed';
    await fetch(`/api/lesson-plans/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this lesson plan?')) return;
    await fetch(`/api/lesson-plans/${id}`, { method: 'DELETE' });
    load();
  }

  if (!items) return <div className="text-sm text-textSecondary">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-text">Lesson plans</div>
        <button onClick={() => { setModal(true); setError(''); }} className="btn btn-primary !py-1.5 !px-3 text-xs">
          Add lesson plan
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card text-sm text-textSecondary">No lesson plans yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((lp) => (
            <div key={lp.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text">{lp.topic}</div>
                  <div className="text-xs text-textSecondary mt-0.5">
                    {lp.batch_name} · {lp.subject} {lp.planned_date ? `· ${lp.planned_date}` : ''}
                  </div>
                  {lp.description && <div className="text-sm text-textSecondary mt-2">{lp.description}</div>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => toggleStatus(lp)}
                    className={`badge ${lp.status === 'Completed' ? 'badge-green' : 'badge-amber'}`}
                  >
                    {lp.status}
                  </button>
                  <button onClick={() => remove(lp.id)} className="text-danger text-xs font-medium hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add lesson plan">
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="text-sm text-danger">{error}</div>}
          {!batchFilter && (
            <div>
              <label className="label">Batch</label>
              <select className="input" required value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })}>
                <option value="">Select batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Subject</label>
              <input className="input" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <label className="label">Planned date</label>
              <input type="date" className="input" value={form.planned_date} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Topic</label>
            <input className="input" required value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
