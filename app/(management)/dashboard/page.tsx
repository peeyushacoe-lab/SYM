'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import Badge from '@/components/Badge';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

const statusTone: Record<string, 'blue' | 'green' | 'red' | 'amber' | 'gray'> = {
  Pending: 'amber',
  Joined: 'green',
  Lost: 'red',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) return <div className="text-sm text-textSecondary">Loading dashboard...</div>;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <section className="glass rounded-xl p-6 shadow-soft relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none">
          <svg className="w-full h-full fill-tertiary" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,95.5,-2.9C94.2,12.2,85.6,26.9,75.1,39.3C64.6,51.7,52.2,61.8,38.3,69.5C24.4,77.2,9,82.5,-5.5,85.6C-20,88.7,-33.5,89.5,-46.1,83.8C-58.7,78.1,-70.4,65.9,-78.4,51.6C-86.4,37.3,-90.7,20.9,-91.1,4.9C-91.5,-11.1,-88,-26.7,-79.8,-39.8C-71.6,-52.9,-58.7,-63.5,-44.6,-70.7C-30.5,-77.9,-15.2,-81.7,0.7,-82.8C16.6,-83.9,30.6,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>
        <div className="relative z-10">
          <p className="text-[11px] font-semibold text-tertiary uppercase tracking-[0.08em] mb-2">{dateLabel}</p>
          <h2 className="text-[24px] font-semibold tracking-tight text-on-surface mb-1">{greeting}</h2>
          <p className="text-sm text-on-surface-variant">Here is the overview of the institutional metrics for today.</p>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total students" value={stats.students} tone="blue" icon="group" />
        <StatCard label="Fee collected" value={formatCurrency(stats.feeCollected)} tone="green" icon="account_balance_wallet" />
        <StatCard label="Due fees" value={formatCurrency(stats.dueFees)} tone="red" icon="schedule" />
        <StatCard label="Active batches" value={stats.batches} tone="amber" icon="book" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Staff" value={stats.staff} tone="blue" icon="badge" />
        <StatCard label="Enquiries" value={stats.enquiries} tone="blue" icon="contact_support" />
        <StatCard label="Total expenses" value={formatCurrency(stats.expenses)} tone="amber" icon="receipt_long" />
        <StatCard label="This month income" value={formatCurrency(stats.monthlyIncome)} tone="green" icon="trending_up" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="This month expense" value={formatCurrency(stats.monthlyExpense)} tone="red" icon="trending_down" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
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

        <div className="card">
          <div className="text-[13px] font-medium text-text mb-3">Income vs expense (last months)</div>
          {stats.incomeVsExpense?.length ? (
            <div className="space-y-2">
              {stats.incomeVsExpense.map((row: any) => {
                const exp = stats.expenseByMonth.find((e: any) => e.month === row.month);
                return (
                  <div key={row.month} className="text-xs">
                    <div className="flex justify-between text-textSecondary mb-1">
                      <span>{row.month}</span>
                      <span>{formatCurrency(row.total)} in / {formatCurrency(exp?.total || 0)} out</span>
                    </div>
                    <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden flex">
                      <div className="bg-primary h-full" style={{ width: '60%' }} />
                      <div className="bg-danger h-full" style={{ width: '30%' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-textSecondary">No data yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
