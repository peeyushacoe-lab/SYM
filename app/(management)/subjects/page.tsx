'use client';

import { useEffect, useState } from 'react';
import CrudPage from '@/components/CrudPage';

export default function SubjectsPage() {
  const [batchOptions, setBatchOptions] = useState<{ value: any; label: string }[]>([]);

  useEffect(() => {
    fetch('/api/batches')
      .then((r) => r.json())
      .then((d) => setBatchOptions((d.items || []).map((b: any) => ({ value: b.id, label: b.name }))));
  }, []);

  const noBatches = batchOptions.length === 0;

  return (
    <CrudPage
      title="Subjects"
      subtitle={
        noBatches
          ? 'Add a batch first — subjects belong to a batch (e.g. 11th standard, 12th standard), so there’s nothing to attach one to yet.'
          : 'Manage each batch’s subject list — used for exams and instructor assignment'
      }
      endpoint="/api/subjects"
      searchPlaceholder="Search subjects..."
      addLabel="Add subject"
      canAdd={!noBatches}
      columns={[
        { key: 'name', label: 'Subject name' },
        { key: 'batch_name', label: 'Batch' },
      ]}
      fields={[
        {
          name: 'batch_id',
          label: 'Batch',
          type: 'select',
          required: true,
          options: batchOptions,
          hint: 'The subject list is specific to this batch — e.g. 11th standard and 12th standard can each have their own subjects.',
        },
        { name: 'name', label: 'Subject name', required: true },
      ]}
    />
  );
}
