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

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total students" value={stats.students} tone="blue" />
        <StatCard label="Fee collected" value={formatCurrency(stats.feeCollected)} tone="green" />
        <StatCard label="Due fees" value={formatCurrency(stats.dueFees)} tone="red" />
        <StatCard label="Active batches" value={stats.batches} tone="amber" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Staff" value={stats.staff} tone="blue" />
        <StatCard label="Enquiries" value={stats.enquiries} tone="blue" />
        <StatCard label="This month income" value={formatCurrency(stats.monthlyIncome)} tone="green" />
        <StatCard label="This month expense" value={formatCurrency(stats.monthlyExpense)} tone="red" />
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
                    <div className="h-1.5 bg-surface rounded-full overflow-hidden flex">
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
