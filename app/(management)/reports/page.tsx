'use client';

import { useEffect, useState } from 'react';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function ReportsPage() {
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/reports/admissions')
      .then((r) => r.json())
      .then((d) => setAdmissions(d.items || []));
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setStats);
  }, []);

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="text-[13px] font-medium text-text mb-3">Income vs expense by month</div>
        {stats?.incomeVsExpense?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-textSecondary uppercase">
                <th className="py-1.5">Month</th>
                <th className="py-1.5">Income</th>
                <th className="py-1.5">Expense</th>
              </tr>
            </thead>
            <tbody>
              {stats.incomeVsExpense.map((row: any) => {
                const exp = stats.expenseByMonth.find((e: any) => e.month === row.month);
                return (
                  <tr key={row.month} className="border-t border-borderLight">
                    <td className="py-1.5">{row.month}</td>
                    <td className="py-1.5 text-accent">{formatCurrency(row.total)}</td>
                    <td className="py-1.5 text-danger">{formatCurrency(exp?.total || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-sm text-textSecondary">No data yet.</div>
        )}
      </div>

      <div className="card p-0 overflow-x-auto">
        <div className="px-4 py-3 border-b border-border text-[13px] font-medium text-text">Admissions report</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Name</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Course</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Batch</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Admission date</th>
            </tr>
          </thead>
          <tbody>
            {admissions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-textSecondary text-sm">
                  No admissions yet.
                </td>
              </tr>
            ) : (
              admissions.map((s) => (
                <tr key={s.id} className="border-b border-borderLight last:border-0">
                  <td className="px-4 py-2.5">{s.name}</td>
                  <td className="px-4 py-2.5">{s.course || '-'}</td>
                  <td className="px-4 py-2.5">{s.batch_name || '-'}</td>
                  <td className="px-4 py-2.5">{s.admission_date || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
