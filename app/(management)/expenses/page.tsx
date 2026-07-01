'use client';

import CrudPage from '@/components/CrudPage';

export default function ExpensesPage() {
  return (
    <CrudPage
      title="Expenses"
      subtitle="Track institute expenses"
      endpoint="/api/expenses"
      searchPlaceholder="Search expenses..."
      addLabel="Add expense"
      columns={[
        { key: 'expense_date', label: 'Date' },
        { key: 'category', label: 'Category' },
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount' },
        { key: 'payment_mode', label: 'Mode' },
      ]}
      fields={[
        { name: 'expense_date', label: 'Date', type: 'date', required: true },
        { name: 'category', label: 'Category' },
        { name: 'description', label: 'Description' },
        { name: 'amount', label: 'Amount', type: 'number', required: true },
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
        { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
      ]}
    />
  );
}
