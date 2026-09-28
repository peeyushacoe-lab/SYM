'use client';

import { useEffect, useState } from 'react';
import CrudPage from '@/components/CrudPage';
import StaffAttendanceGrid from '@/components/StaffAttendanceGrid';

export default function StaffPage() {
  const [batchOptions, setBatchOptions] = useState<{ value: any; label: string }[]>([]);
  const [allSubjects, setAllSubjects] = useState<{ id: number; batch_id: number; name: string }[]>([]);
  const [staffCount, setStaffCount] = useState(0);

  useEffect(() => {
    fetch('/api/batches')
      .then((r) => r.json())
      .then((d) => setBatchOptions((d.items || []).map((b: any) => ({ value: b.id, label: b.name }))));
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((d) => setAllSubjects(d.items || []));
    fetch('/api/staff')
      .then((r) => r.json())
      .then((d) => setStaffCount((d.items || []).length));
  }, []);

  const noBatches = batchOptions.length === 0;
  // Simple school-wide unique number, same <year><3-digit position> style as
  // the student roll number, but not scoped to a batch (Administrators have
  // none, and an instructor's number shouldn't reset just because they're on
  // a smaller batch). Still editable afterwards.
  const suggestedStaffNumber = `${new Date().getFullYear()}${String(staffCount + 1).padStart(3, '0')}`;

  return (
    <div className="space-y-5">
      <CrudPage
        title="Staff"
        subtitle="Manage institute staff records"
        endpoint="/api/staff"
        searchPlaceholder="Search staff..."
        addLabel="Add staff"
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'staff_number', label: 'Staff #' },
          {
            key: 'staff_type',
            label: 'Type',
            render: (r) => (
              <span className={`badge ${r.staff_type === 'Administrator' ? 'badge-blue' : 'badge-green'}`}>
                {r.staff_type === 'Administrator' ? 'Administrator' : 'Instructor/Teacher'}
              </span>
            ),
          },
          { key: 'batch_name', label: 'Batch' },
          { key: 'designation', label: 'Designation' },
          { key: 'mobile', label: 'Mobile' },
          { key: 'salary', label: 'Salary' },
          { key: 'joining_date', label: 'Joining date' },
        ]}
        fields={[
          { name: 'name', label: 'Full name', required: true },
          {
            name: 'staff_number',
            label: 'Staff number',
            defaultValue: suggestedStaffNumber,
            hint: 'Auto-suggested unique number — edit if you need a different one.',
          },
          {
            name: 'staff_type',
            label: 'Staff type',
            type: 'select',
            defaultValue: 'Instructor',
            options: [
              { value: 'Instructor', label: 'Instructor / Teacher' },
              { value: 'Administrator', label: 'Administrator' },
            ],
            hint: 'Administrator gets an attendance-marking login. Instructor/Teacher is appointed to a batch and its subjects, and can optionally get a teacher portal login.',
            onValueChange: (value) => (value === 'Administrator' ? { batch_id: '', subject_ids: [] } : undefined),
          },
          {
            name: 'batch_id',
            label: 'Batch',
            type: 'select',
            options: batchOptions,
            showIf: (form) => form.staff_type !== 'Administrator',
            required: (form) => form.staff_type !== 'Administrator',
            hint: noBatches
              ? 'No batches exist yet — add a batch first before appointing an instructor.'
              : 'Which batch is this instructor being appointed to.',
            onValueChange: () => ({ subject_ids: [] }),
          },
          {
            name: 'subject_ids',
            label: 'Subjects taught',
            type: 'multiselect',
            showIf: (form) => form.staff_type !== 'Administrator' && !!form.batch_id,
            options: (form) =>
              allSubjects
                .filter((s) => String(s.batch_id) === String(form.batch_id))
                .map((s) => ({ value: s.id, label: s.name })),
            computeValue: (row) => (Array.isArray(row.subject_ids) ? row.subject_ids : []),
            hint: 'Only subjects belonging to the selected batch are shown here.',
            span: 2,
          },
          {
            name: 'create_account',
            label: 'Create login account',
            type: 'checkbox',
            defaultValue: 1,
            computeValue: (row) => (row.user_id ? 1 : 0),
            hint: 'On: generates a password and emails their login. Off: no login is created (turn it on later from Edit to create one retroactively — this never deletes an existing login).',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'email',
            showIf: (form) => Number(form.create_account) === 1,
            required: (form) => Number(form.create_account) === 1,
            hint: 'Their login and password will be sent to this email. Turning the toggle off skips creating a login (you can turn it on later from Edit).',
          },
          { name: 'mobile', label: 'Mobile', type: 'tel' },
          { name: 'designation', label: 'Designation' },
          { name: 'salary', label: 'Salary', type: 'number' },
          { name: 'joining_date', label: 'Joining date', type: 'date' },
          { name: 'address', label: 'Address', type: 'textarea', span: 2 },
          { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
        ]}
      />
      <StaffAttendanceGrid />
    </div>
  );
}
