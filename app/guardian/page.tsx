'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/Badge';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function GuardianHome() {
  const [children, setChildren] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/guardian/children')
      .then((r) => r.json())
      .then((d) => setChildren(d.items || []));
    fetch('/api/notices')
      .then((r) => r.json())
      .then((d) => setNotices(d.items || []));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-medium text-text mb-1">My children</h1>
        <p className="text-xs text-textSecondary mb-4">Select a child to view profile, fees and attendance.</p>

        {children.length === 0 ? (
          <div className="card text-sm text-textSecondary">No children are linked to your account yet. Contact management.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {children.map((c) => (
              <Link key={c.id} href={`/guardian/child/${c.id}`} className="card hover:border-primary transition block">
                <div className="text-sm font-medium text-text">{c.name}</div>
                <div className="text-xs text-textSecondary mt-1">{c.batch_name || 'No batch'} - {c.course || ''}</div>
                <div className="mt-3">
                  {c.due_amount > 0 ? (
                    <Badge tone="red">Due: {formatCurrency(c.due_amount)}</Badge>
                  ) : (
                    <Badge tone="green">Fees clear</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="text-[13px] font-medium text-text mb-2">Notices</div>
        {notices.length === 0 ? (
          <div className="card text-sm text-textSecondary">No notices yet.</div>
        ) : (
          <div className="space-y-2">
            {notices.map((n) => (
              <div key={n.id} className="card">
                <div className="text-sm font-medium text-text">{n.title}</div>
                {n.body && <div className="text-sm text-textSecondary mt-1">{n.body}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
