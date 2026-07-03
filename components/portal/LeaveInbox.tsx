'use client';

import { useEffect, useState } from 'react';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';

function tone(status: string): 'green' | 'red' | 'amber' {
  if (status === 'Approved') return 'green';
  if (status === 'Rejected') return 'red';
  return 'amber';
}

// Leave request inbox with approve/reject. Used by teacher & management.
export default function LeaveInbox() {
  const [items, setItems] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<'Pending' | 'All'>('Pending');
  const [respondTo, setRespondTo] = useState<any | null>(null);
  const [decision, setDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/leave')
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }

  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/leave/${respondTo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: decision, response_note: note }),
    });
    setSaving(false);
    setRespondTo(null);
    setNote('');
    load();
  }

  if (!items) return <div className="text-sm text-textSecondary">Loading...</div>;

  const visible = filter === 'Pending' ? items.filter((l) => l.status === 'Pending') : items;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-text">Leave requests</div>
        <div className="flex gap-1">
          {(['Pending', 'All'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === f ? 'bg-tertiary text-white' : 'text-on-surface-variant hover:bg-white/60'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card text-sm text-textSecondary">
          {filter === 'Pending' ? 'No pending leave requests.' : 'No leave requests yet.'}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((l) => (
            <div key={l.id} className="card">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-semibold text-text">{l.student_name}</div>
                  <div className="text-xs text-textSecondary">
                    {l.batch_name || 'No batch'} · Requested by {l.requested_by_name || '-'}
                  </div>
                </div>
                <Badge tone={tone(l.status)}>{l.status}</Badge>
              </div>
              <div className="text-sm text-text mt-2">
                {l.from_date} to {l.to_date}
              </div>
              <div className="text-sm text-textSecondary mt-0.5">{l.reason}</div>
              {l.response_note && (
                <div className="text-xs text-textSecondary mt-1.5 bg-surface-container-low rounded-lg px-2.5 py-1.5">
                  Response{l.responded_by_name ? ` by ${l.responded_by_name}` : ''}: {l.response_note}
                </div>
              )}
              {l.status === 'Pending' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setRespondTo(l); setDecision('Approved'); }}
                    className="btn btn-primary !py-1 !px-2.5 text-xs"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { setRespondTo(l); setDecision('Rejected'); }}
                    className="btn btn-outline !py-1 !px-2.5 text-xs text-danger"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!respondTo}
        onClose={() => setRespondTo(null)}
        title={`${decision === 'Approved' ? 'Approve' : 'Reject'} leave for ${respondTo?.student_name || ''}`}
      >
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-textSecondary">
            {respondTo?.from_date} to {respondTo?.to_date}: {respondTo?.reason}
          </p>
          <div>
            <label className="label">Note (optional)</label>
            <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRespondTo(null)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : decision === 'Approved' ? 'Approve leave' : 'Reject leave'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
