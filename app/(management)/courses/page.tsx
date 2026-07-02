'use client';

import CrudPage from '@/components/CrudPage';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function CoursesPage() {
  return (
    <CrudPage
      title="Courses"
      subtitle="Manage the courses your institute offers"
      endpoint="/api/courses"
      searchPlaceholder="Search courses..."
      addLabel="Add course"
      columns={[
        { key: 'name', label: 'Course name' },
        { key: 'fee', label: 'Course fee', render: (r) => formatCurrency(r.fee) },
        { key: 'duration', label: 'Duration' },
        { key: 'remarks', label: 'Remarks' },
      ]}
      fields={[
        { name: 'name', label: 'Course name', required: true },
        { name: 'fee', label: 'Course fee', type: 'number' },
        { name: 'duration', label: 'Duration (e.g. 6 months)' },
        { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
      ]}
    />
  );
}
