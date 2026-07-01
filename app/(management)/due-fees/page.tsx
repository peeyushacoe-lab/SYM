'use client';

import CrudPage from '@/components/CrudPage';
import Badge from '@/components/Badge';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function DueFeesPage() {
  return (
    <CrudPage
      title="Due fees"
      subtitle="Students with pending fee balances"
      endpoint="/api/fees/due"
      searchPlaceholder="Search by student name or mobile..."
      canAdd={false}
      canDelete={false}
      columns={[
        { key: 'student_name', label: 'Student' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'batch_name', label: 'Batch' },
        { key: 'course_fee', label: 'Course fee', render: (r) => formatCurrency(r.course_fee) },
        { key: 'amount_paid', label: 'Paid', render: (r) => formatCurrency(r.amount_paid) },
        {
          key: 'remaining_due',
          label: 'Due',
          render: (r) => <Badge tone="red">{formatCurrency(r.remaining_due)}</Badge>,
        },
      ]}
      fields={[
        { name: 'course_fee', label: 'Total course fee', type: 'number', required: true },
        { name: 'amount_paid', label: 'Amount paid so far', type: 'number', required: true },
        { name: 'payment_date', label: 'Last payment date', type: 'date' },
        { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
      ]}
    />
  );
}
