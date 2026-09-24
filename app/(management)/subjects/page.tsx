'use client';

import CrudPage from '@/components/CrudPage';

export default function SubjectsPage() {
  return (
    <CrudPage
      title="Subjects"
      subtitle="Manage the list of subjects used for exams"
      endpoint="/api/subjects"
      searchPlaceholder="Search subjects..."
      addLabel="Add subject"
      columns={[{ key: 'name', label: 'Subject name' }]}
      fields={[{ name: 'name', label: 'Subject name', required: true }]}
    />
  );
}
