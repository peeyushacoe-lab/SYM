'use client';

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.06em] text-textSecondary">{label}</div>
      <div className="text-sm text-text mt-0.5">{value || '-'}</div>
    </div>
  );
}

export default function ProfileCard({ student }: { student: any }) {
  const initials = (student.name || '?')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-4">
          {student.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.photo} alt={student.name} className="w-16 h-16 rounded-full object-cover border border-border" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-tertiary text-white flex items-center justify-center text-lg font-semibold">
              {initials}
            </div>
          )}
          <div>
            <div className="text-lg font-semibold text-text">{student.name}</div>
            <div className="text-sm text-textSecondary">
              {student.course || 'No course'} · {student.batch_name || 'No batch'}
              {student.timing ? ` (${student.timing})` : ''}
            </div>
            <div className="text-xs text-textSecondary mt-0.5">
              Roll no. {student.roll_number || '-'} · Reg. {student.registration_number || '-'}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="text-[13px] font-semibold text-text mb-3">Personal details</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
          <Field label="Father's name" value={student.father_name} />
          <Field label="Mother's name" value={student.mother_name} />
          <Field label="Date of birth" value={student.dob} />
          <Field label="Gender" value={student.gender} />
          <Field label="Qualification" value={student.qualification} />
          <Field label="Aadhaar" value={student.aadhaar ? `XXXX-XXXX-${String(student.aadhaar).slice(-4)}` : null} />
        </div>
      </div>

      <div className="card">
        <div className="text-[13px] font-semibold text-text mb-3">Contact</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
          <Field label="Mobile" value={student.mobile} />
          <Field label="Alternate mobile" value={student.alt_mobile} />
          <Field label="Email" value={student.email} />
          <div className="col-span-2 sm:col-span-3">
            <Field label="Address" value={student.address} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="text-[13px] font-semibold text-text mb-3">Admission</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
          <Field label="Admission date" value={student.admission_date} />
          <Field label="Course" value={student.course} />
          <Field label="Batch" value={student.batch_name} />
          <Field label="Batch timing" value={student.timing} />
          <Field label="Batch starts" value={student.batch_start} />
          <Field label="Batch ends" value={student.batch_end} />
          <Field label="Fee type" value={student.batch_id ? student.fee_type || 'CourseWise' : null} />
          <Field
            label="Fee plan"
            value={
              student.batch_id
                ? student.fee_category === 'Custom' && student.fee_amount
                  ? `Custom (Rs. ${Number(student.fee_amount).toLocaleString('en-IN')})`
                  : 'Default (course fee)'
                : null
            }
          />
          <Field label="Advance fee" value={student.batch_id ? (Number(student.batch_advance_fee) ? 'On' : 'Off') : null} />
        </div>
        {student.remarks && (
          <div className="mt-4 text-sm text-textSecondary border-t border-borderLight pt-3">{student.remarks}</div>
        )}
      </div>
    </div>
  );
}
