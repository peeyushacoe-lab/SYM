'use client';

import { useEffect, useState } from 'react';
import Tabs from '@/components/Tabs';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import LeaveInbox from '@/components/portal/LeaveInbox';

const TABS = [
  { key: 'leave', label: 'Leave requests', icon: 'event_busy' },
  { key: 'queries', label: 'Queries', icon: 'forum' },
];

function queryTone(status: string): 'green' | 'gray' | 'blue' {
  if (status === 'Answered') return 'green';
  if (status === 'Closed') return 'gray';
  return 'blue';
}

export default function ManagementRequestsPage() {
  const [tab, setTab] = useState('leave');

  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'leave' && <LeaveInbox />}
      {tab === 'queries' && <QueriesInbox />}
    </div>
  );
}

function QueriesInbox() {
  const [items, setItems] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<'Open' | 'All'>('Open');
  const [respondTo, setRespondTo] = useState<any | null>(null);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('Answered');
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/queries')
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }

  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/queries/${respondTo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response, status }),
    });
    setSaving(false);
    setRespondTo(null);
    setResponse('');
    load();
  }

  if (!items) return <div className="text-sm text-textSecondary">Loading...</div>;

  const visible = filter === 'Open' ? items.filter((q) => q.status === 'Open') : items;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-text">Queries from students, guardians & teachers</div>
        <div className="flex gap-1">
          {(['Open', 'All'] as const).map((f) => (
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
          {filter === 'Open' ? 'No open queries.' : 'No queries yet.'}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((q) => (
            <div key={q.id} className="card">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-semibold text-text">{q.subject}</div>
                  <div className="text-xs text-textSecondary">
                    From {q.raised_by_name || '-'} ({q.raised_by_role || '-'})
                    {q.student_name ? ` · About ${q.student_name}` : ''} · {(q.created_at || '').slice(0, 10)}
                  </div>
                </div>
                <Badge tone={queryTone(q.status)}>{q.status}</Badge>
              </div>
              {q.message && <div className="text-sm text-textSecondary mt-2">{q.message}</div>}
              {q.response && (
                <div className="text-xs text-textSecondary mt-1.5 bg-surface-container-low rounded-lg px-2.5 py-1.5">
                  Reply: {q.response}
                </div>
              )}
              {q.status === 'Open' && (
                <button
                  onClick={() => { setRespondTo(q); setResponse(''); setStatus('Answered'); }}
                  className="btn btn-primary !py-1 !px-2.5 text-xs mt-3"
                >
                  Respond
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!respondTo} onClose={() => setRespondTo(null)} title={`Respond: ${respondTo?.subject || ''}`}>
        <form onSubmit={submit} className="space-y-4">
          {respondTo?.message && <p className="text-sm text-textSecondary">{respondTo.message}</p>}
          <div>
            <label className="label">Response</label>
            <textarea
              className="input"
              rows={3}
              required
              value={response}
              onChange={(e) => setResponse(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Answered">Answered</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRespondTo(null)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Sending...' : 'Send response'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
