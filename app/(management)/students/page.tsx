'use client';

import { useEffect, useState } from 'react';
import CrudPage from '@/components/CrudPage';

export default function StudentsPage() {
  const [batchOptions, setBatchOptions] = useState<{ value: any; label: string }[]>([]);

  useEffect(() => {
    fetch('/api/batches')
      .then((r) => r.json())
      .then((d) => setBatchOptions((d.items || []).map((b: any) => ({ value: b.id, label: b.name }))));
  }, []);

  return (
    <CrudPage
      title="Students"
      subtitle="Manage student admissions and profiles"
      endpoint="/api/students"
      searchPlaceholder="Search by name, mobile, roll number..."
      addLabel="Add student"
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'course', label: 'Course' },
        { key: 'batch_name', label: 'Batch' },
        { key: 'roll_number', label: 'Roll no.' },
        { key: 'admission_date', label: 'Admission date' },
      ]}
      fields={[
        { name: 'name', label: 'Full name', required: true },
        { name: 'mobile', label: 'Mobile', required: true, type: 'tel' },
        { name: 'alt_mobile', label: 'Alternate mobile', type: 'tel' },
        { name: 'father_name', label: "Father's name" },
        { name: 'mother_name', label: "Mother's name" },
        { name: 'dob', label: 'Date of birth', type: 'date' },
        {
          name: 'gender',
          label: 'Gender',
          type: 'select',
          options: [
            { value: 'Male', label: 'Male' },
            { value: 'Female', label: 'Female' },
            { value: 'Other', label: 'Other' },
          ],
        },
        { name: 'qualification', label: 'Qualification' },
        { name: 'course', label: 'Course' },
        { name: 'batch_id', label: 'Batch', type: 'select', options: batchOptions },
        { name: 'admission_date', label: 'Admission date', type: 'date' },
        { name: 'roll_number', label: 'Roll number' },
        { name: 'registration_number', label: 'Registration number' },
        { name: 'aadhaar', label: 'Aadhaar number' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'address', label: 'Address', type: 'textarea', span: 2 },
        { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
      ]}
    />
  );
}
