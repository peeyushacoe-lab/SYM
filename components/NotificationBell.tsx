'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function NotificationBell() {
  const [counts, setCounts] = useState({ pendingLeave: 0, openQueries: 0, followUps: 0, recentNotices: 0 });
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function load() {
    fetch('/api/notifications/summary')
      .then((r) => r.json())
      .then((d) => {
        setCounts(d.counts || {});
        setTotal(d.total || 0);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const items = [
    { label: 'Follow-ups due', count: counts.followUps, href: '/enquiries', icon: 'alarm', color: 'text-danger' },
    { label: 'Pending leave requests', count: counts.pendingLeave, href: '/requests', icon: 'event_busy', color: 'text-amber-600' },
    { label: 'Open queries', count: counts.openQueries, href: '/requests', icon: 'forum', color: 'text-tertiary' },
    { label: 'Recent notices', count: counts.recentNotices, href: '/notices', icon: 'campaign', color: 'text-purple-600' },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        className="relative text-on-surface-variant hover:text-tertiary p-1.5 hover:bg-white/50 rounded-lg transition-all"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined">notifications</span>
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 glass-modal rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant/30 text-[13px] font-semibold text-on-surface">
            Notifications
          </div>
          {total === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-textSecondary">You're all caught up!</div>
          ) : (
            <div className="py-1">
              {items
                .filter((i) => i.count > 0)
                .map((i) => (
                  <Link
                    key={i.label}
                    href={i.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low/70 transition-colors"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${i.color}`}>{i.icon}</span>
                    <span className="flex-1 text-sm text-on-surface">{i.label}</span>
                    <span className="text-xs font-semibold text-textSecondary">{i.count}</span>
                  </Link>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
