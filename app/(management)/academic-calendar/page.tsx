'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';

const EVENT_TYPES = ['Event', 'Holiday', 'Exam', 'Meeting', 'Deadline'];
const EVENT_TONE: Record<string, 'blue' | 'green' | 'red' | 'amber' | 'gray'> = {
  Event: 'blue',
  Holiday: 'green',
  Exam: 'red',
  Meeting: 'amber',
  Deadline: 'gray',
};

const emptyForm = { title: '', description: '', event_type: 'Event', start_date: '', end_date: '', audience: 'All' };

export default function AcademicCalendarPage() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/academic-events')
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }

  useEffect(load, []);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(ev: any) {
    setEditing(ev);
    setForm({
      title: ev.title,
      description: ev.description || '',
      event_type: ev.event_type,
      start_date: (ev.start_date || '').slice(0, 10),
      end_date: (ev.end_date || '').slice(0, 10),
      audience: ev.audience,
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await fetch(`/api/academic-events/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } else {
      await fetch('/api/academic-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    setOpen(false);
    setForm(emptyForm);
    setEditing(null);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this event?')) return;
    await fetch(`/api/academic-events/${id}`, { method: 'DELETE' });
    load();
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = items.filter((e) => (e.end_date || e.start_date) >= today);
  const past = items.filter((e) => (e.end_date || e.start_date) < today);

  function renderEvent(ev: any) {
    return (
      <div key={ev.id} className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-text">{ev.title}</div>
              <Badge tone={EVENT_TONE[ev.event_type] || 'gray'}>{ev.event_type}</Badge>
            </div>
            {ev.description && <div className="text-sm text-textSecondary mt-1">{ev.description}</div>}
            <div className="mt-2 flex items-center gap-2 text-xs text-textLight">
              <span className="material-symbols-outlined text-[14px]">calendar_month</span>
              {ev.start_date}
              {ev.end_date && ev.end_date !== ev.start_date ? ` – ${ev.end_date}` : ''}
              <Badge tone="gray">{ev.audience}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => openEdit(ev)} className="text-tertiary text-xs font-medium hover:underline">
              Edit
            </button>
            <button onClick={() => handleDelete(ev.id)} className="text-danger text-xs font-medium hover:underline">
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium text-text">Academic calendar</h1>
          <p className="text-xs text-textSecondary mt-0.5">Holidays, exams, meetings and important dates</p>
        </div>
        <button onClick={openNew} className="btn btn-primary">
          + New event
        </button>
      </div>

      <div className="space-y-3 mb-6">
        <div className="text-[13px] font-semibold text-text">Upcoming</div>
        {upcoming.length === 0 ? (
          <div className="card text-sm text-textSecondary">No upcoming events.</div>
        ) : (
          upcoming.map(renderEvent)
        )}
      </div>

      {past.length > 0 && (
        <div className="space-y-3">
          <div className="text-[13px] font-semibold text-text">Past</div>
          {past.map(renderEvent)}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit event' : 'New event'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Audience</label>
              <select className="input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                <option value="All">Everyone</option>
                <option value="Teachers">Teachers only</option>
                <option value="Students">Students only</option>
                <option value="Guardians">Guardians only</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start date *</label>
              <input type="date" className="input" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="label">End date</label>
              <input type="date" className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Add event'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
