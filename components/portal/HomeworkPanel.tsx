'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Homework list + create form. Shared by teacher and management (readOnly=false).
// Also used read-only by student/guardian portals (readOnly=true).
export default function HomeworkPanel({
  batchFilter,
  readOnly = false,
}: {
  batchFilter?: number | string;
  readOnly?: boolean;
}) {
  const [items, setItems] = useState<any[] | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ batch_id: '', subject: '', title: '', description: '', due_date: '' });
  const [attachment, setAttachment] = useState<{ name: string; dataUrl: string } | null>(null);

  function load() {
    const url = batchFilter ? `/api/homework?batch_id=${batchFilter}` : '/api/homework';
    fetch(url)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }

  useEffect(() => {
    load();
    if (!readOnly) {
      fetch('/api/teacher/batches')
        .then((r) => (r.ok ? r.json() : fetch('/api/batches').then((r2) => r2.json())))
        .then((d) => setBatches(d.items || []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchFilter]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setAttachment({ name: file.name, dataUrl });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/homework', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        batch_id: Number(batchFilter || form.batch_id),
        attachment_name: attachment?.name || null,
        attachment_data_url: attachment?.dataUrl || null,
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) return setError(d.error || 'Failed to assign homework.');
    setModal(false);
    setForm({ batch_id: '', subject: '', title: '', description: '', due_date: '' });
    setAttachment(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this homework?')) return;
    await fetch(`/api/homework/${id}`, { method: 'DELETE' });
    load();
  }

  if (!items) return <div className="text-sm text-textSecondary">Loading...</div>;

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold text-text">Homework & study materials</div>
          <button onClick={() => { setModal(true); setError(''); }} className="btn btn-primary !py-1.5 !px-3 text-xs">
            Assign homework
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card text-sm text-textSecondary">No homework assigned yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((h) => (
            <div key={h.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text">{h.title}</div>
                  <div className="text-xs text-textSecondary mt-0.5">
                    {h.batch_name} {h.subject ? `· ${h.subject}` : ''} {h.due_date ? `· Due ${h.due_date}` : ''}
                  </div>
                  {h.description && <div className="text-sm text-textSecondary mt-2">{h.description}</div>}
                  {h.attachment_name && (
                    <a
                      href={h.attachment_data_url}
                      download={h.attachment_name}
                      className="inline-flex items-center gap-1 text-xs text-tertiary font-medium mt-2 hover:underline"
                    >
                      <span className="material-symbols-outlined text-[15px]">attach_file</span>
                      {h.attachment_name}
                    </a>
                  )}
                </div>
                {!readOnly && (
                  <button onClick={() => remove(h.id)} className="text-danger text-xs font-medium hover:underline shrink-0">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Assign homework">
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
              <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <label className="label">Due date</label>
              <input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Instructions / description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Attachment (optional)</label>
            <input type="file" className="input" onChange={handleFile} />
            {attachment && <p className="text-[11px] text-textSecondary mt-1">{attachment.name}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Assigning...' : 'Assign'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
