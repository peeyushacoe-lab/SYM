'use client';

import CrudPage from '@/components/CrudPage';
import Badge from '@/components/Badge';

const statusTone: Record<string, 'blue' | 'green' | 'red' | 'amber' | 'gray'> = {
  Pending: 'amber',
  Joined: 'green',
  Lost: 'red',
};

export default function EnquiriesPage() {
  return (
    <CrudPage
      title="Enquiries"
      subtitle="Track prospective students and follow-ups"
      endpoint="/api/enquiries"
      searchPlaceholder="Search enquiries..."
      addLabel="Add enquiry"
      columns={[
        { key: 'student_name', label: 'Name' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'course_interested', label: 'Course interested' },
        { key: 'follow_up_date', label: 'Follow up' },
        { key: 'status', label: 'Status', render: (row) => <Badge tone={statusTone[row.status] || 'gray'}>{row.status}</Badge> },
      ]}
      fields={[
        { name: 'student_name', label: 'Name', required: true },
        { name: 'mobile', label: 'Mobile', type: 'tel' },
        { name: 'course_interested', label: 'Course interested' },
        { name: 'qualification', label: 'Qualification' },
        { name: 'enquiry_date', label: 'Enquiry date', type: 'date' },
        { name: 'follow_up_date', label: 'Follow up date', type: 'date' },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'Pending', label: 'Pending' },
            { value: 'Joined', label: 'Joined' },
            { value: 'Lost', label: 'Lost' },
          ],
        },
        { name: 'address', label: 'Address', type: 'textarea', span: 2 },
        { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
      ]}
      extraActions={(row, reload) =>
        !row.converted ? (
          <button
            onClick={async () => {
              await fetch(`/api/enquiries/${row.id}/convert`, { method: 'POST' });
              reload();
            }}
            className="text-accent text-xs font-medium hover:underline"
          >
            Convert
          </button>
        ) : (
          <Badge tone="green">Converted</Badge>
        )
      }
    />
  );
}
