'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';

export default function NoticesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', audience: 'All' });
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/notices')
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }

  useEffect(load, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setOpen(false);
    setForm({ title: '', body: '', audience: 'All' });
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this notice?')) return;
    await fetch(`/api/notices/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium text-text">Notices</h1>
          <p className="text-xs text-textSecondary mt-0.5">Announcements for teachers, guardians and students</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn btn-primary">
          + New notice
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="card text-sm text-textSecondary">No notices yet.</div>
        ) : (
          items.map((n) => (
            <div key={n.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-text">{n.title}</div>
                  {n.body && <div className="text-sm text-textSecondary mt-1">{n.body}</div>}
                  <div className="mt-2 flex items-center gap-2">
                    <Badge tone="blue">{n.audience}</Badge>
                    <span className="text-xs text-textLight">{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(n.id)} className="text-danger text-xs font-medium hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New notice">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input" rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <div>
            <label className="label">Audience</label>
            <select className="input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              <option value="All">Everyone</option>
              <option value="Teachers">Teachers only</option>
              <option value="Guardians">Guardians only</option>
              <option value="Students">Students only</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Posting...' : 'Post notice'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
