'use client';

import { useEffect, useState } from 'react';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

const EXPORTS: { type: string; label: string; icon: string }[] = [
  { type: 'students', label: 'Student list', icon: 'school' },
  { type: 'enquiries', label: 'Enquiry list', icon: 'contact_support' },
  { type: 'fees', label: 'Fee collection', icon: 'account_balance_wallet' },
  { type: 'due-fees', label: 'Due fee list', icon: 'schedule' },
  { type: 'expenses', label: 'Expense list', icon: 'receipt_long' },
  { type: 'staff', label: 'Staff list', icon: 'badge' },
  { type: 'monthly', label: 'Monthly summary', icon: 'monitoring' },
];

export default function ReportsPage() {
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/reports/admissions')
      .then((r) => r.json())
      .then((d) => setAdmissions(d.items || []));
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setStats);
    fetch('/api/batches')
      .then((r) => r.json())
      .then((d) => setBatches(d.items || []));
  }, []);

  return (
    <div className="space-y-5">
      <style>{`@media print { aside, header, .no-print { display: none !important; } main { margin: 0 !important; } }`}</style>

      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">Reports</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">Summaries, exports and printable reports</p>
        </div>
        <button onClick={() => window.print()} className="btn btn-outline">
          <span className="material-symbols-outlined text-[18px]">print</span>
          Print this page
        </button>
      </div>

      {/* Excel exports */}
      <div className="card no-print">
        <div className="text-[13px] font-semibold text-on-surface mb-3">Export to Excel (.xlsx)</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {EXPORTS.map((e) => (
            <a
              key={e.type}
              href={`/api/export?type=${e.type}`}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-surface-container-low/60 hover:bg-surface-container hover:border-tertiary-fixed-dim text-sm text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-tertiary text-[20px]">{e.icon}</span>
              {e.label}
              <span className="material-symbols-outlined text-on-surface-variant text-[16px] ml-auto">download</span>
            </a>
          ))}
        </div>
        <p className="text-xs text-on-surface-variant mt-3">
          Each sheet has filter dropdowns on the header row for sorting and filtering in Excel.
        </p>
      </div>

      {/* Monthly summary */}
      <div className="card">
        <div className="text-[13px] font-semibold text-on-surface mb-3">Monthly summary — income vs expense</div>
        {stats?.incomeVsExpense?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-on-surface-variant uppercase tracking-wide">
                <th className="py-1.5">Month</th>
                <th className="py-1.5">Income</th>
                <th className="py-1.5">Expense</th>
                <th className="py-1.5">Net</th>
              </tr>
            </thead>
            <tbody>
              {stats.incomeVsExpense.map((row: any) => {
                const exp = stats.expenseByMonth.find((e: any) => e.month === row.month);
                const net = (row.total || 0) - (exp?.total || 0);
                return (
                  <tr key={row.month} className="border-t border-outline-variant/25">
                    <td className="py-1.5">{row.month}</td>
                    <td className="py-1.5 text-accent">{formatCurrency(row.total)}</td>
                    <td className="py-1.5 text-danger">{formatCurrency(exp?.total || 0)}</td>
                    <td className={`py-1.5 font-medium ${net >= 0 ? 'text-accent' : 'text-danger'}`}>{formatCurrency(net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-sm text-on-surface-variant">No data yet.</div>
        )}
      </div>

      {/* Batch-wise report */}
      <div className="card p-0 overflow-x-auto">
        <div className="px-4 py-3 border-b border-outline-variant/30 text-[13px] font-semibold text-on-surface">
          Batch-wise report
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 text-left">
              {['Batch', 'Course', 'Timing', 'Students', 'Capacity'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
                  {h}
                </th>
              ))}
              <th className="px-4 py-2.5 no-print" />
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant text-sm">
                  No batches yet.
                </td>
              </tr>
            ) : (
              batches.map((b) => (
                <tr key={b.id} className="border-b border-outline-variant/25 last:border-0">
                  <td className="px-4 py-2.5">{b.name}</td>
                  <td className="px-4 py-2.5">{b.course || '-'}</td>
                  <td className="px-4 py-2.5">{b.timing || '-'}</td>
                  <td className="px-4 py-2.5">{b.student_count ?? '-'}</td>
                  <td className="px-4 py-2.5">{b.capacity ?? '-'}</td>
                  <td className="px-4 py-2.5 text-right no-print">
                    <a
                      href={`/api/export?type=batch-students&batch_id=${b.id}`}
                      className="text-tertiary text-xs font-medium hover:underline"
                    >
                      Export students
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Admissions report */}
      <div className="card p-0 overflow-x-auto">
        <div className="px-4 py-3 border-b border-outline-variant/30 text-[13px] font-semibold text-on-surface">
          Admissions report
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 text-left">
              {['Name', 'Course', 'Batch', 'Admission date'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admissions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-on-surface-variant text-sm">
                  No admissions yet.
                </td>
              </tr>
            ) : (
              admissions.map((s) => (
                <tr key={s.id} className="border-b border-outline-variant/25 last:border-0">
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
