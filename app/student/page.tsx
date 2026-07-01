'use client';

import { useEffect, useState } from 'react';
import Badge from '@/components/Badge';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function StudentHome() {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [notices, setNotices] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/student/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      });
    fetch('/api/notices')
      .then((r) => r.json())
      .then((d) => setNotices(d.items || []));
  }, []);

  if (error) return <div className="card text-sm text-textSecondary">{error}</div>;
  if (!data) return <div className="text-sm text-textSecondary">Loading...</div>;

  const { student, fees, attendance, attendancePct } = data;
  const totalDue = fees.reduce((sum: number, f: any) => sum + (f.remaining_due || 0), 0);

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="text-lg font-medium text-text">{student.name}</div>
        <div className="text-sm text-textSecondary mt-1">
          {student.course} - {student.batch_name || 'No batch'} {student.timing ? `(${student.timing})` : ''}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <div className="text-xs text-textSecondary">Roll no.</div>
            <div className="text-text">{student.roll_number || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-textSecondary">Admission date</div>
            <div className="text-text">{student.admission_date || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-textSecondary">Attendance</div>
            <div className="text-text">{attendancePct !== null ? `${attendancePct}%` : 'No data'}</div>
          </div>
          <div>
            <div className="text-xs text-textSecondary">Fee due</div>
            <div>
              <Badge tone={totalDue > 0 ? 'red' : 'green'}>{formatCurrency(totalDue)}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <div className="px-4 py-3 border-b border-border text-[13px] font-medium text-text">Fee history</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Course fee</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Paid</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Due</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Date</th>
            </tr>
          </thead>
          <tbody>
            {fees.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-textSecondary text-sm">
                  No fee records yet.
                </td>
              </tr>
            ) : (
              fees.map((f: any) => (
                <tr key={f.id} className="border-b border-borderLight last:border-0">
                  <td className="px-4 py-2.5">{formatCurrency(f.course_fee)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(f.amount_paid)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={f.remaining_due > 0 ? 'red' : 'green'}>{formatCurrency(f.remaining_due)}</Badge>
                  </td>
                  <td className="px-4 py-2.5">{f.payment_date || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
