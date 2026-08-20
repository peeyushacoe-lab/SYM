'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/Badge';
import QuickAddFab from '@/components/QuickAddFab';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

const statusTone: Record<string, 'blue' | 'green' | 'red' | 'amber' | 'gray'> = {
  Pending: 'amber',
  Joined: 'green',
  Lost: 'red',
};

const ATT_COLORS: Record<string, string> = {
  Present: 'bg-green-500',
  Absent: 'bg-red-500',
  Leave: 'bg-amber-500',
  Holiday: 'bg-blue-500',
};

function ProgressBar({ marked, total, label, icon }: { marked: number; total: number; label: string; icon: string }) {
  const pct = total > 0 ? Math.round((marked / total) * 100) : 0;
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-[13px] font-medium text-on-surface">
          <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>
          {label}
        </span>
        <span className="text-xs font-semibold text-primary">
          {marked}/{total}
        </span>
      </div>
      <div className="h-2 bg-surface-container-high rounded-full overflow-hidden border border-outline-variant/30">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[11px] text-on-surface-variant mt-1">{pct}% marked today</div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) return <div className="text-sm text-textSecondary">Loading dashboard...</div>;

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  // Attendance summary chart: group per day
  const attByDay: Record<string, Record<string, number>> = {};
  (stats.attendanceSummary || []).forEach((r: any) => {
    const day = String(Number(r.date.slice(8, 10)));
    attByDay[day] = attByDay[day] || {};
    attByDay[day][r.status] = Number(r.c);
  });
  const attDays = Object.keys(attByDay);
  const attMax = Math.max(1, ...attDays.map((d) => Object.values(attByDay[d]).reduce((a, b) => a + b, 0)));

  return (
    <div className="space-y-5 pb-24">
      {/* Overview: Active / Closed */}
      <section className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-on-surface">Overview</span>
          <span className="text-[11px] text-on-surface-variant grid grid-cols-2 gap-6 text-right">
            <span>Active</span>
            <span>Closed</span>
          </span>
        </div>
        {[
          ['group', 'Students', stats.students, stats.studentsClosed, '/students'],
          ['flag', 'Batches', stats.batches, 0, '/batches'],
          ['badge', 'Staff', stats.staff, 0, '/staff'],
          ['contact_support', 'Enquiries', stats.enquiriesActive, stats.enquiriesClosed, '/enquiries'],
        ].map(([icon, label, active, closed, href]: any) => (
          <Link key={label} href={href} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-container-high border-b border-outline-variant/20 last:border-0">
            <span className="flex items-center gap-2.5 text-sm text-on-surface">
              <span className="material-symbols-outlined text-[20px] text-primary">{icon}</span>
              {label}
            </span>
            <span className="grid grid-cols-2 gap-6 text-right min-w-[110px]">
              <span className="text-[15px] font-semibold text-on-surface">{active}</span>
              <span className="text-[15px] font-semibold text-on-surface-variant">{closed}</span>
            </span>
          </Link>
        ))}
      </section>

      {/* Attendance summary chart */}
      <section className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">monitoring</span>
            Attendance Summary
          </span>
          <span className="text-xs text-on-surface-variant">{monthLabel}</span>
        </div>
        {attDays.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-sm text-on-surface-variant">No data this month</div>
        ) : (
          <div className="flex items-end gap-1 h-28 overflow-x-auto pb-1">
            {attDays.map((d) => {
              const total = Object.values(attByDay[d]).reduce((a, b) => a + b, 0);
              return (
                <div key={d} className="flex flex-col items-center gap-1 min-w-[22px]">
                  <div className="flex flex-col-reverse w-4 rounded overflow-hidden" style={{ height: `${(total / attMax) * 88}px` }}>
                    {Object.entries(attByDay[d]).map(([status, c]) => (
                      <div key={status} className={ATT_COLORS[status] || 'bg-gray-400'} style={{ height: `${(c / total) * 100}%` }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-on-surface-variant">{d}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          {Object.entries(ATT_COLORS).map(([label, cls]) => (
            <span key={label} className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
              <span className={`w-4 h-1.5 rounded-full inline-block ${cls}`} />
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* Attendance progress bars */}
      <div className="grid sm:grid-cols-2 gap-3">
        <ProgressBar marked={stats.studentAttendanceMarked} total={stats.studentAttendanceTotal} label="Student Attendance" icon="group" />
        <ProgressBar marked={stats.staffAttendanceMarked} total={stats.staffAttendanceTotal} label="Staff Attendance" icon="badge" />
      </div>

      {/* Due fees + Exams + Birthdays */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/due-fees" className="card col-span-2 hover:bg-surface-container-high transition">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-medium text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">table_view</span>
              Due Fees
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">open_in_new</span>
          </div>
          <div className="flex items-end gap-6">
            <div>
              <span className="text-[22px] font-semibold text-red-500">({stats.dueStudents})</span>{' '}
              <span className="text-[22px] font-semibold text-on-surface">{formatCurrency(stats.dueFees)}</span>
              <p className="text-[11px] text-on-surface-variant">Students with dues</p>
            </div>
          </div>
        </Link>
        <Link href="/exams" className="card hover:bg-surface-container-high transition">
          <span className="text-[13px] font-medium text-on-surface flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[18px] text-primary">quiz</span>
            Exams
          </span>
          <p className="text-[22px] font-semibold text-on-surface">{stats.exams}</p>
          <p className="text-[11px] text-on-surface-variant">Total exams</p>
        </Link>
        <div className="card">
          <span className="text-[13px] font-medium text-on-surface flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[18px] text-primary">cake</span>
            Birthdays
          </span>
          <p className="text-[22px] font-semibold text-on-surface">{stats.birthdaysToday?.length || 0}</p>
          <p className="text-[11px] text-on-surface-variant">Today&apos;s birthdays</p>
          {(stats.birthdaysToday || []).slice(0, 3).map((b: any) => (
            <div key={b.id} className="text-xs text-on-surface mt-1 flex items-center justify-between">
              <span>{b.name}</span>
              {b.mobile && (
                <a
                  className="text-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://wa.me/${String(b.mobile).replace(/\D/g, '').length === 10 ? '91' : ''}${String(b.mobile).replace(/\D/g, '')}?text=${encodeURIComponent(`Happy Birthday ${b.name}! Best wishes from Shiksha Yogi.`)}`}
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Monthly summary */}
      <section className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">insights</span>
            Monthly Summary
          </span>
          <span className="text-xs text-on-surface-variant">{monthLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-green-600">Collected Fees</span>
              <Link href="/fees" className="material-symbols-outlined text-[14px] text-on-surface-variant">open_in_new</Link>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Today', stats.collected.today], ['This month', stats.collected.month], ['All time', stats.collected.allTime]].map(
                ([l, v]: any) => (
                  <div key={l}>
                    <p className="text-[15px] font-semibold text-on-surface">{formatCurrency(v)}</p>
                    <p className="text-[10px] text-on-surface-variant">{l}</p>
                  </div>
                )
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-red-500">Expenses</span>
              <Link href="/expenses" className="material-symbols-outlined text-[14px] text-on-surface-variant">open_in_new</Link>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Today', stats.spent.today], ['This month', stats.spent.month], ['All time', stats.spent.allTime]].map(([l, v]: any) => (
                <div key={l}>
                  <p className="text-[15px] font-semibold text-on-surface">{formatCurrency(v)}</p>
                  <p className="text-[10px] text-on-surface-variant">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enquiry + recent */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/enquiries" className="card hover:bg-surface-container-high transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">contact_support</span>
              Enquiry
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">open_in_new</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['Total', stats.enquiries], ['Active', stats.enquiriesActive], ['Closed', stats.enquiriesClosed]].map(([l, v]: any) => (
              <div key={l}>
                <p className="text-[20px] font-semibold text-on-surface">{v}</p>
                <p className="text-[10px] text-on-surface-variant">{l}</p>
              </div>
            ))}
          </div>
        </Link>

        <div className="card">
          <div className="text-[13px] font-medium text-text mb-3">Recent enquiries</div>
          {stats.recentEnquiries?.length ? (
            <div className="space-y-2.5">
              {stats.recentEnquiries.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span className="text-text">{e.student_name}</span>
                  <Badge tone={statusTone[e.status] || 'gray'}>{e.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-textSecondary">No enquiries yet.</div>
          )}
        </div>
      </div>

      <QuickAddFab />
    </div>
  );
}
