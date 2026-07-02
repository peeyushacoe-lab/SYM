'use client';

import { useState } from 'react';
import CrudPage from '@/components/CrudPage';

export default function ExpensesPage() {
  const [month, setMonth] = useState('');

  return (
    <CrudPage
      title="Expenses"
      subtitle="Track institute expenses"
      endpoint="/api/expenses"
      searchPlaceholder="Search expenses..."
      addLabel="Add expense"
      extraQuery={month ? `month=${month}` : ''}
      headerActions={
        <a href={`/api/export?type=expenses${month ? `&month=${month}` : ''}`} className="btn btn-outline">
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
            { value: 'UPI', label: 'UPI' },
            { value: 'Bank Transfer', label: 'Bank Transfer' },
          ],
        },
        { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
      ]}
    />
  );
}
