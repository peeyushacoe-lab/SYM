'use client';

import { useEffect, useState } from 'react';
import CrudPage from '@/components/CrudPage';
import Badge from '@/components/Badge';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function FeesPage() {
  const [studentOptions, setStudentOptions] = useState<{ value: any; label: string }[]>([]);

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
            { value: 'Online', label: 'Online' },
            { value: 'Cheque', label: 'Cheque' },
          ],
        },
        { name: 'receipt_number', label: 'Receipt number' },
        { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
      ]}
    />
  );
}
