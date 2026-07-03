'use client';

import { useEffect, useState } from 'react';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';

function leaveTone(status: string): 'green' | 'red' | 'amber' {
  if (status === 'Approved') return 'green';
  if (status === 'Rejected') return 'red';
  return 'amber';
}

function queryTone(status: string): 'green' | 'gray' | 'blue' {
  if (status === 'Answered') return 'green';
  if (status === 'Closed') return 'gray';
  return 'blue';
}

// studentId: pass for guardian flows (which child); omit for student (own record).
export default function RequestsSection({ studentId }: { studentId?: number | string }) {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [queries, setQueries] = useState<any[]>([]);
  const [leaveModal, setLeaveModal] = useState(false);
  const [queryModal, setQueryModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [leaveForm, setLeaveForm] = useState({ from_date: '', to_date: '', reason: '' });
  const [queryForm, setQueryForm] = useState({ subject: '', message: '' });

  const suffix = studentId ? `?student_id=${studentId}` : '';

  function load() {
    fetch(`/api/leave${suffix}`)
      .then((r) => r.json())
      .then((d) => setLeaves(d.items || []));
    fetch(`/api/queries${suffix}`)
      .then((r) => r.json())
      .then((d) => setQueries(d.items || []));
  }

  useEffect(load, [studentId]);

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...leaveForm, student_id: studentId }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) return setError(d.error || 'Failed to submit.');
    setLeaveModal(false);
    setLeaveForm({ from_date: '', to_date: '', reason: '' });
    load();
  }

  async function submitQuery(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/queries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...queryForm, student_id: studentId }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) return setError(d.error || 'Failed to submit.');
    setQueryModal(false);
    setQueryForm({ subject: '', message: '' });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="card p-0">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="text-[13px] font-semibold text-text">Leave requests</div>
          <button onClick={() => { setLeaveModal(true); setError(''); }} className="btn btn-primary !py-1 !px-2.5 text-xs">
            Apply for leave
          </button>
        </div>
        {leaves.length === 0 ? (
          <div className="px-4 py-6 text-sm text-textSecondary">No leave requests yet.</div>
        ) : (
          <div className="divide-y divide-borderLight">
            {leaves.map((l) => (
              <div key={l.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-sm font-medium text-text">
                    {l.from_date} to {l.to_date}
                  </div>
                  <Badge tone={leaveTone(l.status)}>{l.status}</Badge>
                </div>
                <div className="text-sm text-textSecondary mt-1">{l.reason}</div>
                {l.response_note && (
                  <div className="text-xs text-textSecondary mt-1.5 bg-surface-container-low rounded-lg px-2.5 py-1.5">
                    Response{l.responded_by_name ? ` from ${l.responded_by_name}` : ''}: {l.response_note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-0">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="text-[13px] font-semibold text-text">Queries to the institute</div>
          <button onClick={() => { setQueryModal(true); setError(''); }} className="btn btn-primary !py-1 !px-2.5 text-xs">
            Raise a query
          </button>
        </div>
        {queries.length === 0 ? (
          <div className="px-4 py-6 text-sm text-textSecondary">No queries raised yet.</div>
        ) : (
          <div className="divide-y divide-borderLight">
            {queries.map((q) => (
              <div key={q.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-sm font-medium text-text">{q.subject}</div>
                  <Badge tone={queryTone(q.status)}>{q.status}</Badge>
                </div>
                {q.message && <div className="text-sm text-textSecondary mt-1">{q.message}</div>}
                {q.response && (
                  <div className="text-xs text-textSecondary mt-1.5 bg-surface-container-low rounded-lg px-2.5 py-1.5">
                    Reply{q.responded_by_name ? ` from ${q.responded_by_name}` : ''}: {q.response}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={leaveModal} onClose={() => setLeaveModal(false)} title="Apply for leave">
        <form onSubmit={submitLeave} className="space-y-4">
          {error && <div className="text-sm text-danger">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">From date</label>
              <input
                type="date"
                className="input"
                required
                value={leaveForm.from_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">To date</label>
              <input
                type="date"
                className="input"
                required
                value={leaveForm.to_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea
              className="input"
              rows={3}
              required
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setLeaveModal(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={queryModal} onClose={() => setQueryModal(false)} title="Raise a query">
        <form onSubmit={submitQuery} className="space-y-4">
          {error && <div className="text-sm text-danger">{error}</div>}
          <div>
            <label className="label">Subject</label>
            <input
              className="input"
              required
              value={queryForm.subject}
              onChange={(e) => setQueryForm({ ...queryForm, subject: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              className="input"
              rows={4}
              value={queryForm.message}
              onChange={(e) => setQueryForm({ ...queryForm, message: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setQueryModal(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
