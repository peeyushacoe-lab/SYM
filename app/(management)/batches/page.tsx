'use client';

import CrudPage from '@/components/CrudPage';

export default function BatchesPage() {
  return (
    <CrudPage
      title="Batches"
      subtitle="Manage course batches and schedules"
      endpoint="/api/batches"
      searchPlaceholder="Search batches..."
      addLabel="Add batch"
      columns={[
        { key: 'name', label: 'Batch name' },
        { key: 'course', label: 'Course' },
        { key: 'timing', label: 'Timing' },
        { key: 'student_count', label: 'Students' },
        { key: 'capacity', label: 'Capacity' },
        { key: 'start_date', label: 'Start date' },
      ]}
      fields={[
        { name: 'name', label: 'Batch name', required: true },
        { name: 'course', label: 'Course' },
        { name: 'timing', label: 'Timing (e.g. 9-11 AM)' },
        { name: 'capacity', label: 'Capacity', type: 'number' },
        { name: 'start_date', label: 'Start date', type: 'date' },
        { name: 'end_date', label: 'End date', type: 'date' },
        { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
      ]}
    />
  );
}
