'use client';

import { useEffect, useState } from 'react';
import CrudPage from '@/components/CrudPage';
import Badge from '@/components/Badge';
import FeeShareActions from '@/components/FeeShareActions';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

function printReceipt(row: any) {
  const w = window.open('', '_blank', 'width=600,height=750');
  if (!w) return;
  const logoUrl = new URL('/logo-128.png', window.location.origin).href;
  w.document.write(`<!DOCTYPE html><html><head><title>Fee Receipt</title>
    <style>
      body { font-family: 'Geist', system-ui, sans-serif; color: #0c1c2e; padding: 32px; }
      .head { display: flex; align-items: center; gap: 14px; justify-content: center; text-align: center;
        border-bottom: 2px solid #2c6291; padding-bottom: 14px; margin-bottom: 20px; }
      .head img { width: 48px; height: 48px; object-fit: contain; }
      .head h1 { margin: 0; font-size: 22px; letter-spacing: 0.04em; }
      .head p { margin: 4px 0 0; color: #444748; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 14px; }
      td { padding: 8px 4px; border-bottom: 1px solid #dbe6f7; }
      td:first-child { color: #444748; width: 45%; }
      .total { font-weight: 600; font-size: 16px; }
      .foot { margin-top: 28px; display: flex; justify-content: space-between; font-size: 12px; color: #444748; }
      .sig { margin-top: 48px; text-align: right; font-size: 13px; }
      .sig .name { font-weight: 600; color: #0c1c2e; }
      .sig .title { color: #444748; font-size: 12px; }
    </style></head><body>
    <div class="head">
      <img src="${logoUrl}" alt="Shiksha Yogi" />
      <div>
        <h1>SHIKSHA YOGI</h1>
        <p>Fee Receipt${row.receipt_number ? ' · No. ' + row.receipt_number : ''}</p>
      </div>
    </div>
    <table>
      <tr><td>Student</td><td>${row.student_name || '-'}</td></tr>
      <tr><td>Mobile</td><td>${row.mobile || '-'}</td></tr>
      <tr><td>Batch</td><td>${row.batch_name || '-'}</td></tr>
      <tr><td>Payment date</td><td>${row.payment_date || '-'}</td></tr>
      <tr><td>Payment mode</td><td>${row.payment_mode || '-'}</td></tr>
      <tr><td>Total course fee</td><td>${formatCurrency(row.course_fee)}</td></tr>
      <tr class="total"><td>Amount paid</td><td>${formatCurrency(row.amount_paid)}</td></tr>
      <tr><td>Remaining due</td><td>${formatCurrency(row.remaining_due)}</td></tr>
      ${row.due_date ? `<tr><td>Next due date</td><td>${row.due_date}</td></tr>` : ''}
      ${row.remarks ? `<tr><td>Remarks</td><td>${row.remarks}</td></tr>` : ''}
    </table>
    <div class="foot"><span>Generated on ${new Date().toLocaleDateString('en-IN')}</span><span>SYM - Siksha Yogi Management</span></div>
    <div class="sig">
      <div class="name">Manish Singh</div>
      <div class="title">Centre Incharge</div>
    </div>
    <script>window.onload = () => window.print();</script>
    </body></html>`);
  w.document.close();
}

export default function FeesPage() {
  const [studentOptions, setStudentOptions] = useState<{ value: any; label: string }[]>([]);
  const [month, setMonth] = useState('');

  useEffect(() => {
    fetch('/api/students')
      .then((r) => r.json())
      .then((d) =>
        setStudentOptions((d.items || []).map((s: any) => ({ value: s.id, label: `${s.name} (${s.mobile})` })))
      );
  }, []);

  return (
    <CrudPage
      title="Fee collection"
      subtitle="Record and manage student fee payments"
      endpoint="/api/fees"
      searchPlaceholder="Search by student name or mobile..."
      addLabel="Record payment"
      extraQuery={month ? `month=${month}` : ''}
      headerActions={
        <a href={`/api/export?type=fees${month ? `&month=${month}` : ''}`} className="btn btn-outline">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export Excel
        </a>
      }
      extraFilters={
        <input
          type="month"
          className="input max-w-[170px]"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          title="Filter by month"
        />
      }
      columns={[
        { key: 'student_name', label: 'Student' },
        { key: 'batch_name', label: 'Batch' },
        { key: 'course_fee', label: 'Course fee', render: (r) => formatCurrency(r.course_fee) },
        { key: 'amount_paid', label: 'Paid', render: (r) => formatCurrency(r.amount_paid) },
        {
          key: 'remaining_due',
          label: 'Due',
          render: (r) => (
            <Badge tone={r.remaining_due > 0 ? 'red' : 'green'}>{formatCurrency(r.remaining_due)}</Badge>
          ),
        },
        { key: 'payment_date', label: 'Date' },
        { key: 'payment_mode', label: 'Mode' },
        { key: 'receipt_number', label: 'Receipt' },
      ]}
      fields={[
        { name: 'student_id', label: 'Student', type: 'select', required: true, options: studentOptions, span: 2 },
        { name: 'course_fee', label: 'Total course fee', type: 'number', required: true },
        { name: 'amount_paid', label: 'Amount paid now', type: 'number', required: true },
        { name: 'payment_date', label: 'Payment date', type: 'date' },
        {
          name: 'payment_mode',
          label: 'Payment mode',
          type: 'select',
          options: [
            { value: 'Cash', label: 'Cash' },
            { value: 'UPI', label: 'UPI' },
            { value: 'Bank Transfer', label: 'Bank Transfer' },
          ],
        },
        { name: 'receipt_number', label: 'Receipt number' },
        { name: 'due_date', label: 'Next due date', type: 'date' },
        { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
      ]}
      extraActions={(row) => (
        <div className="flex items-center gap-3">
          <button onClick={() => printReceipt(row)} className="text-tertiary text-xs font-medium hover:underline">
            Print
          </button>
          <FeeShareActions row={row} />
        </div>
      )}
    />
  );
}
