'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/Badge';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function GuardianHome() {
  const [children, setChildren] = useState<any[] | null>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/guardian/children')
      .then((r) => r.json())
      .then((d) => setChildren(d.items || []));
    fetch('/api/notices')
      .then((r) => r.json())
      .then((d) => setNotices(d.items || []));
    fetch('/api/leave')
      .then((r) => r.json())
      .then((d) => setLeaves((d.items || []).filter((l: any) => l.status === 'Pending')));
    fetch('/api/academic-events')
      .then((r) => r.json())
      .then((d) => setEvents((d.items || []).filter((e: any) => (e.end_date || e.start_date) >= new Date().toISOString().slice(0, 10))));
  }, []);

  if (!children) return <div className="text-sm text-textSecondary">Loading...</div>;

  const totalDue = children.reduce((s, c) => s + (c.due_amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card !py-3">
          <div className="text-[11px] uppercase text-textSecondary">Children</div>
          <div className="text-xl font-semibold text-text mt-1">{children.length}</div>
        </div>
        <div className="card !py-3">
          <div className="text-[11px] uppercase text-textSecondary">Total fee due</div>
          <div className={`text-xl font-semibold mt-1 ${totalDue > 0 ? 'text-danger' : 'text-accent'}`}>
            {formatCurrency(totalDue)}
          </div>
        </div>
        <div className="card !py-3">
          <div className="text-[11px] uppercase text-textSecondary">Pending leaves</div>
          <div className="text-xl font-semibold text-text mt-1">{leaves.length}</div>
        </div>
      </div>

      <div>
        <h1 className="text-lg font-semibold text-text mb-1">My children</h1>
        <p className="text-xs text-textSecondary mb-4">
          Select a child to view profile, attendance, fees, results, timetable and requests.
        </p>

        {children.length === 0 ? (
          <div className="card text-sm text-textSecondary">
            No children are linked to your account yet. Contact management.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {children.map((c) => (
              <Link key={c.id} href={`/guardian/child/${c.id}`} className="card hover:border-tertiary transition block">
                <div className="text-sm font-semibold text-text">{c.name}</div>
                <div className="text-xs text-textSecondary mt-1">
                  {c.batch_name || 'No batch'} · {c.course || 'No course'}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  {c.due_amount > 0 ? (
                    <Badge tone="red">Due: {formatCurrency(c.due_amount)}</Badge>
                  ) : (
                    <Badge tone="green">Fees clear</Badge>
                  )}
                  <span className="text-xs text-tertiary font-medium">View details</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {events.length > 0 && (
        <div>
          <div className="text-[13px] font-semibold text-text mb-2">Upcoming events</div>
          <div className="space-y-2">
            {events.slice(0, 5).map((e) => (
              <div key={e.id} className="card flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-text">{e.title}</div>
                  <div className="text-xs text-textSecondary mt-0.5">
                    {e.start_date}{e.end_date && e.end_date !== e.start_date ? ` – ${e.end_date}` : ''}
                  </div>
                </div>
                <Badge tone="blue">{e.event_type}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-[13px] font-semibold text-text mb-2">Notices</div>
        {notices.length === 0 ? (
          <div className="card text-sm text-textSecondary">No notices yet.</div>
        ) : (
          <div className="space-y-2">
            {notices.slice(0, 5).map((n) => (
              <div key={n.id} className="card">
                <div className="text-sm font-medium text-text">{n.title}</div>
                {n.body && <div className="text-sm text-textSecondary mt-1">{n.body}</div>}
                <div className="text-[11px] text-textSecondary mt-1.5">{(n.created_at || '').slice(0, 10)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
