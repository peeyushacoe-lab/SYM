'use client';

import CrudPage from '@/components/CrudPage';
import StaffAttendanceGrid from '@/components/StaffAttendanceGrid';

export default function StaffPage() {
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
          {
            key: 'staff_type',
            label: 'Type',
            render: (r) => (
              <span className={`badge ${r.staff_type === 'Administrator' ? 'badge-blue' : 'badge-green'}`}>
                {r.staff_type === 'Administrator' ? 'Administrator' : 'Instructor/Teacher'}
              </span>
            ),
          },
          { key: 'designation', label: 'Designation' },
          { key: 'mobile', label: 'Mobile' },
          { key: 'salary', label: 'Salary' },
          { key: 'joining_date', label: 'Joining date' },
        ]}
        fields={[
          { name: 'name', label: 'Full name', required: true },
          {
            name: 'staff_type',
            label: 'Staff type',
            type: 'select',
            defaultValue: 'Instructor',
            options: [
              { value: 'Instructor', label: 'Instructor / Teacher' },
              { value: 'Administrator', label: 'Administrator' },
            ],
            hint: 'Administrator gets their own login to mark attendance for all staff. Instructor/Teacher is just a designation.',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'email',
            showIf: (form) => form.staff_type === 'Administrator',
            required: true,
            hint: 'Their attendance-marking login and password will be sent to this email.',
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
