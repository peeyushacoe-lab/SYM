'use client';

import CrudPage from '@/components/CrudPage';

export default function StaffPage() {
  return (
    <CrudPage
      title="Staff"
      subtitle="Manage institute staff records"
      endpoint="/api/staff"
      searchPlaceholder="Search staff..."
      addLabel="Add staff"
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'designation', label: 'Designation' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'salary', label: 'Salary' },
        { key: 'joining_date', label: 'Joining date' },
      ]}
      fields={[
        { name: 'name', label: 'Full name', required: true },
        { name: 'mobile', label: 'Mobile', type: 'tel' },
        { name: 'designation', label: 'Designation' },
        { name: 'salary', label: 'Salary', type: 'number' },
        { name: 'joining_date', label: 'Joining date', type: 'date' },
        { name: 'address', label: 'Address', type: 'textarea', span: 2 },
        { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
      ]}
    />
  );
}
