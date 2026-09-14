'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CrudPage from '@/components/CrudPage';

export default function StudentsPage() {
  const [batchOptions, setBatchOptions] = useState<{ value: any; label: string }[]>([]);
  const [batchMap, setBatchMap] = useState<Record<string, { monthly_fee: number; start_date: string | null }>>({});
  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [batchFilter, setBatchFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

  useEffect(() => {
    fetch('/api/batches')
      .then((r) => r.json())
      .then((d) => {
        const items = d.items || [];
        setBatchOptions(items.map((b: any) => ({ value: b.id, label: b.name })));
        const map: Record<string, { monthly_fee: number; start_date: string | null }> = {};
        items.forEach((b: any) => {
          map[String(b.id)] = { monthly_fee: Number(b.monthly_fee) || 0, start_date: b.start_date || null };
        });
        setBatchMap(map);
      });
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
        {
          key: 'status',
          label: 'Status',
          render: (r) => (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${(r.status || 'Active') === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
              {r.status || 'Active'}
            </span>
          ),
        },
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
        {
          name: 'batch_id',
          label: 'Batch',
          type: 'select',
          options: batchOptions,
          // Selecting a batch auto-fills its monthly fee into the Monthly-fee
          // field below (only relevant when fee_type is Monthly/Quarterly —
          // the admin can still edit the amount per student afterwards).
          onValueChange: (value, form) => {
            const batch = batchMap[String(value)];
            if (!batch) return;
            return { batch_monthly_fee: batch.monthly_fee || form.batch_monthly_fee };
          },
        },
        {
          name: 'fee_category',
          label: 'Fee category',
          type: 'select',
          defaultValue: 'Default',
          options: [
            { value: 'Default', label: 'Default Fee (course fee)' },
            { value: 'Custom', label: 'Custom amount' },
          ],
          showIf: (form) => !!form.batch_id && !['Monthly', 'Quarterly'].includes(form.fee_type),
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
          onValueChange: (value, form) => {
            if (!['Monthly', 'Quarterly'].includes(value)) return;
            const batch = batchMap[String(form.batch_id)];
            if (batch && !form.batch_monthly_fee) return { batch_monthly_fee: batch.monthly_fee };
          },
        },
        {
          name: 'fee_amount',
          label: 'Custom fee amount (Rs.)',
          type: 'number',
          showIf: (form) => !!form.batch_id && form.fee_category === 'Custom' && !['Monthly', 'Quarterly'].includes(form.fee_type),
          required: false,
        },
        {
          name: 'batch_monthly_fee',
          label: 'Monthly fee (Rs.)',
          type: 'number',
          showIf: (form) => !!form.batch_id && ['Monthly', 'Quarterly'].includes(form.fee_type),
          hideOnEdit: true,
          hint: 'Auto-filled from the batch — edit here to give this student a different amount.',
        },
        {
          name: 'backdate_fees',
          label: 'Generate fees from batch start date',
          type: 'checkbox',
          defaultValue: 1,
          span: 2,
          showIf: (form) => !!form.batch_id && ['Monthly', 'Quarterly'].includes(form.fee_type),
          hideOnEdit: true,
          hint: 'On: dues start from when the batch began (e.g. batch started March, student joins September → 7 months due). Off: dues start from this student\'s own admission date instead.',
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
