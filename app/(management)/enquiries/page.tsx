'use client';

import { useEffect, useState } from 'react';
import CrudPage from '@/components/CrudPage';
import Badge from '@/components/Badge';

const statusTone: Record<string, 'blue' | 'green' | 'red' | 'amber' | 'gray'> = {
  Interested: 'blue',
  Pending: 'amber',
  Joined: 'green',
  'Not Interested': 'red',
  Lost: 'red',
};

function followUpBadge(row: any) {
  if (!row.follow_up_date) return <span className="text-on-surface-variant">-</span>;
  const isOpen = row.status === 'Pending' || row.status === 'Interested';
  const today = new Date().toISOString().slice(0, 10);
  if (isOpen && row.follow_up_date < today) return <Badge tone="red">{row.follow_up_date} · Overdue</Badge>;
  if (isOpen && row.follow_up_date === today) return <Badge tone="amber">Today</Badge>;
  return <span>{row.follow_up_date}</span>;
}

export default function EnquiriesPage() {
  const [courseOptions, setCourseOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetch('/api/courses')
      .then((r) => r.json())
      .then((d) => setCourseOptions((d.items || []).map((c: any) => ({ value: c.name, label: c.name }))));
  }, []);

  return (
    <CrudPage
      title="Enquiries"
      subtitle="Track prospective students and follow-ups"
      endpoint="/api/enquiries"
      searchPlaceholder="Search enquiries..."
      addLabel="Add enquiry"
      headerActions={
        <a href="/api/export?type=enquiries" className="btn btn-outline">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export Excel
        </a>
      }
      columns={[
        { key: 'student_name', label: 'Name' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'course_interested', label: 'Course interested' },
        { key: 'follow_up_date', label: 'Follow up', render: followUpBadge },
        { key: 'status', label: 'Status', render: (row) => <Badge tone={statusTone[row.status] || 'gray'}>{row.status}</Badge> },
      ]}
      fields={[
        { name: 'student_name', label: 'Name', required: true },
        { name: 'mobile', label: 'Mobile', type: 'tel' },
        { name: 'course_interested', label: 'Course interested', type: 'select', options: courseOptions },
        { name: 'qualification', label: 'Qualification' },
        { name: 'enquiry_date', label: 'Enquiry date', type: 'date' },
        { name: 'follow_up_date', label: 'Follow up date', type: 'date' },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'Interested', label: 'Interested' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Joined', label: 'Joined' },
            { value: 'Not Interested', label: 'Not Interested' },
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
