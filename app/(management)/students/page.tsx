'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CrudPage from '@/components/CrudPage';

export default function StudentsPage() {
  const [batchOptions, setBatchOptions] = useState<{ value: any; label: string }[]>([]);
  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [batchFilter, setBatchFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

  useEffect(() => {
    fetch('/api/batches')
      .then((r) => r.json())
      .then((d) => setBatchOptions((d.items || []).map((b: any) => ({ value: b.id, label: b.name }))));
    fetch('/api/courses')
      .then((r) => r.json())
      .then((d) => setCourseOptions((d.items || []).map((c: any) => c.name)));
  }, []);

  const extraQuery = [
    batchFilter ? `batch_id=${batchFilter}` : '',
    courseFilter ? `course=${encodeURIComponent(courseFilter)}` : '',
  ]
    .filter(Boolean)
    .join('&');

  return (
    <CrudPage
      title="Students"
      subtitle="Manage student admissions and profiles"
      endpoint="/api/students"
      searchPlaceholder="Search by name, mobile, roll number..."
      addLabel="Add student"
      extraQuery={extraQuery}
      headerActions={
        <a href="/api/export?type=students" className="btn btn-outline">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export Excel
        </a>
      }
      extraFilters={
        <>
          <select className="input max-w-[180px]" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
            <option value="">All batches</option>
            {batchOptions.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
          <select className="input max-w-[180px]" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="">All courses</option>
            {courseOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </>
      }
      columns={[
        {
          key: 'name',
          label: 'Name',
          render: (r) => (
            <span className="flex items-center gap-2">
              {r.photo ? (
                <img src={r.photo} alt="" className="w-7 h-7 rounded-full object-cover border border-border" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-surface-container-high text-tertiary flex items-center justify-center text-[10px] font-semibold">
                  {String(r.name || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
              {r.name}
            </span>
          ),
        },
        { key: 'mobile', label: 'Mobile' },
        { key: 'course', label: 'Course' },
        { key: 'batch_name', label: 'Batch' },
        {
          key: 'fee_type',
          label: 'Fee type',
          render: (r) => (r.batch_id ? <span className="badge badge-blue">{r.fee_type || 'CourseWise'}</span> : '-'),
        },
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
        { name: 'course', label: 'Course', type: 'select', options: courseOptions.map((c) => ({ value: c, label: c })) },
        { name: 'batch_id', label: 'Batch', type: 'select', options: batchOptions },
        {
          name: 'fee_category',
          label: 'Fee category',
          type: 'select',
          defaultValue: 'Default',
          options: [
            { value: 'Default', label: 'Default Fee (course fee)' },
            { value: 'Custom', label: 'Custom amount' },
          ],
          showIf: (form) => !!form.batch_id,
          hint: 'Default Fee uses the course fee set in Courses.',
        },
        {
          name: 'fee_type',
          label: 'Fee type',
          type: 'select',
          defaultValue: 'CourseWise',
          options: [
            { value: 'Monthly', label: 'Monthly' },
            { value: 'CourseWise', label: 'CourseWise' },
            { value: 'OneTime', label: 'OneTime' },
            { value: 'Quarterly', label: 'Quarterly' },
            { value: 'Installment', label: 'Installment' },
          ],
          showIf: (form) => !!form.batch_id,
        },
        {
          name: 'fee_amount',
          label: 'Custom fee amount (Rs.)',
          type: 'number',
          showIf: (form) => !!form.batch_id && form.fee_category === 'Custom',
          required: false,
        },
        { name: 'admission_date', label: 'Admission date', type: 'date' },
        { name: 'roll_number', label: 'Roll number' },
        { name: 'registration_number', label: 'Registration number' },
        { name: 'aadhaar', label: 'Aadhaar number' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'photo', label: 'Photo', type: 'file', span: 2 },
        { name: 'address', label: 'Address', type: 'textarea', span: 2 },
        { name: 'remarks', label: 'Remarks', type: 'textarea', span: 2 },
      ]}
      extraActions={(row) => (
        <Link href={`/students/${row.id}`} className="text-tertiary text-xs font-medium hover:underline">
          View
        </Link>
      )}
    />
  );
}
