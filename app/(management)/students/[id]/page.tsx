'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Badge from '@/components/Badge';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function StudentProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [student, setStudent] = useState<any | null>(null);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/students/${id}`).then((r) => r.json()),
      fetch(`/api/fees?student_id=${id}`).then((r) => r.json()),
    ]).then(([s, f]) => {
      setStudent(s.item || null);
      setFees(f.items || []);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="text-sm text-textSecondary">Loading profile...</div>;
  if (!student) return <div className="text-sm text-textSecondary">Student not found.</div>;

  const totalDue = fees.reduce((sum, f) => sum + (Number(f.remaining_due) || 0), 0);
  const totalPaid = fees.reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0);

  const details: [string, any][] = [
    ["Father's name", student.father_name],
    ["Mother's name", student.mother_name],
    ['Mobile', student.mobile],
    ['Alternate mobile', student.alt_mobile],
    ['Date of birth', student.dob],
    ['Gender', student.gender],
    ['Qualification', student.qualification],
    ['Course', student.course],
    ['Batch', student.batch_name],
    ['Admission date', student.admission_date],
    ['Roll number', student.roll_number],
    ['Registration number', student.registration_number],
    ['Aadhaar', student.aadhaar],
    ['Email', student.email],
    ['Address', student.address],
    ['Remarks', student.remarks],
  ];

  return (
    <div className="space-y-5 print:space-y-3" id="student-profile">
      <style>{`@media print { aside, header, .no-print { display: none !important; } main { margin: 0 !important; } }`}</style>

      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <Link href="/students" className="text-tertiary text-sm font-medium hover:underline flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to students
        </Link>
        <button onClick={() => window.print()} className="btn btn-outline">
          <span className="material-symbols-outlined text-[18px]">print</span>
          Print details
        </button>
      </div>

      <div className="card flex items-start gap-5">
        {student.photo ? (
          <img src={student.photo} alt={student.name} className="w-24 h-24 rounded-xl object-cover border border-border" />
        ) : (
          <div className="w-24 h-24 rounded-xl bg-surface-container-high text-tertiary flex items-center justify-center text-3xl font-semibold">
            {String(student.name || '?').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-[24px] font-semibold tracking-tight text-on-surface">{student.name}</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {[student.course, student.batch_name].filter(Boolean).join(' · ') || 'No course assigned'}
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            {student.roll_number && <Badge tone="blue">Roll: {student.roll_number}</Badge>}
            {totalDue > 0 ? <Badge tone="red">Due: {formatCurrency(totalDue)}</Badge> : <Badge tone="green">No dues</Badge>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="text-[13px] font-semibold text-on-surface mb-3">Student details</div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
          {details.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 text-sm border-b border-outline-variant/20 pb-1.5">
              <dt className="text-on-surface-variant">{label}</dt>
              <dd className="text-on-surface text-right">{value || '-'}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="card p-0 overflow-x-auto">
        <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-on-surface">Fee history</span>
          <span className="text-xs text-on-surface-variant">
            Paid {formatCurrency(totalPaid)} · Due {formatCurrency(totalDue)}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 text-left">
              {['Date', 'Course fee', 'Paid', 'Due', 'Mode', 'Receipt', 'Due date'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fees.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant text-sm">
                  No fee records yet.
                </td>
              </tr>
            ) : (
              fees.map((f) => (
                <tr key={f.id} className="border-b border-outline-variant/25 last:border-0">
                  <td className="px-4 py-2.5">{f.payment_date || '-'}</td>
                  <td className="px-4 py-2.5">{formatCurrency(f.course_fee)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(f.amount_paid)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={f.remaining_due > 0 ? 'red' : 'green'}>{formatCurrency(f.remaining_due)}</Badge>
                  </td>
                  <td className="px-4 py-2.5">{f.payment_mode || '-'}</td>
                  <td className="px-4 py-2.5">{f.receipt_number || '-'}</td>
                  <td className="px-4 py-2.5">{f.due_date || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
