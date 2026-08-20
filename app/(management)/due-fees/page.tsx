'use client';

import { useEffect, useState } from 'react';
import CrudPage from '@/components/CrudPage';
import Badge from '@/components/Badge';
import FeeShareActions from '@/components/FeeShareActions';
import BulkReminderModal from '@/components/BulkReminderModal';
import DueFeeAlert from '@/components/DueFeeAlert';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function DueFeesPage() {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [dueRows, setDueRows] = useState<any[]>([]);
  const [alertRow, setAlertRow] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/fees/due')
      .then((r) => r.json())
      .then((d) => setDueRows(d.items || []))
      .catch(() => {});
  }, [bulkOpen]);

  const totalDue = dueRows.reduce((s, r) => s + (Number(r.remaining_due) || 0), 0);
  const uniqueStudents = new Set(dueRows.map((r) => r.student_id)).size;

  return (
    <>
      {/* Due Fees Summary (Tufee-style) */}
      <div className="card mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-on-surface">Due Fees Summary</p>
          <p className="text-[11px] text-on-surface-variant">Students with pending balances</p>
        </div>
        <div className="flex items-center gap-8 text-center">
          <div>
            <p className="text-[22px] font-semibold text-on-surface">{uniqueStudents}</p>
            <p className="text-[10px] text-on-surface-variant">No. of Students</p>
          </div>
          <div>
            <p className="text-[22px] font-semibold text-red-500">{formatCurrency(totalDue)}</p>
            <p className="text-[10px] text-on-surface-variant">Total Due Amount</p>
          </div>
        </div>
      </div>

      <CrudPage
        title="Due fees"
        subtitle="Students with pending fee balances"
        endpoint="/api/fees/due"
        searchPlaceholder="Search by student name or mobile..."
        canAdd={false}
        canDelete={false}
        canEdit={false}
        headerActions={
          <>
            <button onClick={() => setBulkOpen(true)} className="btn btn-outline">
              <span className="material-symbols-outlined text-[18px]">chat</span>
              Bulk Reminder
            </button>
            <a href="/api/export?type=due-fees" className="btn btn-outline">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export Excel
            </a>
          </>
        }
        columns={[
          {
            key: 'student_name',
            label: 'Student',
            render: (r) => (
              <button onClick={() => setAlertRow(r)} className="text-tertiary font-medium hover:underline text-left">
                {r.student_name}
              </button>
            ),
          },
          { key: 'mobile', label: 'Mobile' },
          { key: 'batch_name', label: 'Batch' },
          { key: 'course_fee', label: 'Total fee', render: (r) => formatCurrency(r.course_fee) },
          { key: 'amount_paid', label: 'Paid', render: (r) => formatCurrency(r.amount_paid) },
          {
            key: 'remaining_due',
            label: 'Due',
            render: (r) => <Badge tone="red">{formatCurrency(r.remaining_due)}</Badge>,
          },
          { key: 'due_date', label: 'Due date' },
        ]}
        fields={[]}
        extraActions={(row) => (
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setAlertRow(row)} className="text-textSecondary hover:text-red-500" title="Due fee alert">
              <span className="material-symbols-outlined text-[18px]">notifications_active</span>
            </button>
            <FeeShareActions row={row} />
          </div>
        )}
      />
      <BulkReminderModal open={bulkOpen} onClose={() => setBulkOpen(false)} rows={dueRows} />
      <DueFeeAlert row={alertRow} open={!!alertRow} onClose={() => setAlertRow(null)} />
    </>
  );
}
