'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import TimetableGrid, { DAY_NAMES } from '@/components/portal/TimetableGrid';

export default function ManagementTimetablePage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [batchId, setBatchId] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ day: '0', start_time: '', end_time: '', subject: '', teacher_user_id: '' });

  useEffect(() => {
    fetch('/api/batches')
      .then((r) => r.json())
      .then((d) => {
        const items = d.items || [];
        setBatches(items);
        if (items.length && !batchId) setBatchId(String(items[0].id));
      });
    fetch('/api/users?role=teacher')
      .then((r) => r.json())
      .then((d) => setTeachers((d.items || []).filter((u: any) => u.role === 'teacher')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function load() {
    if (!batchId) return;
    fetch(`/api/timetable?batch_id=${batchId}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.items || []));
  }

  useEffect(load, [batchId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_id: Number(batchId),
        day: Number(form.day),
        start_time: form.start_time,
        end_time: form.end_time || null,
        subject: form.subject,
        teacher_user_id: form.teacher_user_id ? Number(form.teacher_user_id) : null,
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) return setError(d.error || 'Failed to add slot.');
    setModal(false);
    setForm({ day: '0', start_time: '', end_time: '', subject: '', teacher_user_id: '' });
    load();
  }

  async function remove(id: number) {
    await fetch(`/api/timetable/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <select className="input !w-auto" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => { setModal(true); setError(''); }}
          className="btn btn-primary"
          disabled={!batchId}
        >
          Add class slot
        </button>
      </div>

      <TimetableGrid slots={slots} onDelete={remove} />

      <Modal open={modal} onClose={() => setModal(false)} title="Add class slot">
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="text-sm text-danger">{error}</div>}
          <div>
            <label className="label">Day</label>
            <select className="input" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
              {DAY_NAMES.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start time</label>
              <input
                type="time"
                className="input"
                required
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>
            <div>
              <label className="label">End time</label>
              <input
                type="time"
                className="input"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Subject</label>
            <input
              className="input"
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Teacher (optional)</label>
            <select
              className="input"
              value={form.teacher_user_id}
              onChange={(e) => setForm({ ...form, teacher_user_id: e.target.value })}
            >
              <option value="">Not assigned</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Adding...' : 'Add slot'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
