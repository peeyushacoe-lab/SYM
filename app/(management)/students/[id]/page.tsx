'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import StudentDocuments from '@/components/StudentDocuments';
import AttendanceCalendar from '@/components/portal/AttendanceCalendar';

function formatCurrency(n: number) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

function intlDigits(raw: any): string | null {
  if (!raw) return null;
  const d = String(raw).replace(/\D/g, '');
  if (!d) return null;
  return d.length === 10 ? `91${d}` : d;
}

const FEE_TYPES = ['Monthly', 'CourseWise', 'OneTime', 'Quarterly', 'Installment'];

export default function StudentProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const router = useRouter();
  const [student, setStudent] = useState<any | null>(null);
  const [fees, setFees] = useState<any[]>([]);
  const [feeItems, setFeeItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [collect, setCollect] = useState<any>({});
  const [plan, setPlan] = useState<any>({ fee_type: 'Monthly', partial_supported: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([
      fetch(`/api/students/${id}`).then((r) => r.json()),
      fetch(`/api/fees?student_id=${id}`).then((r) => r.json()),
      fetch(`/api/students/${id}/fee-items`).then((r) => r.json()),
      fetch('/api/fee-categories').then((r) => r.json()),
    ]).then(([s, f, fi, c]) => {
      setStudent(s.item || null);
      setFees(f.items || []);
      setFeeItems(fi.items || []);
      setCategories(c.items || []);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function openCollect() {
    setError('');
    const res = await fetch(`/api/students/${id}/collect`);
    const d = await res.json();
    setCollect({
      receipt_number: d.nextReceipt,
      payment_date: new Date().toISOString().slice(0, 10),
      period_from: d.periodFrom,
      period_to: d.periodTo,
      amount_paid: d.suggestedAmount || '',
      discount: 0,
      payment_mode: 'Cash',
      remarks: '',
      fee_item_id: d.feeItem?.id || null,
      feeType: d.feeType,
      partialSupported: d.partialSupported,
      periodsElapsed: d.periodsElapsed || 0,
    });
    setCollectOpen(true);
  }

  async function saveCollect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch(`/api/students/${id}/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collect),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(d.error || 'Failed to collect fee.');
      return;
    }
    setCollectOpen(false);
    load();
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch(`/api/students/${id}/fee-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'Failed to add fee item.');
      return;
    }
    setPlanOpen(false);
    setPlan({ fee_type: 'Monthly', partial_supported: false });
    load();
  }

  async function removeFeeItem(itemId: number) {
    if (!confirm('Remove this fee item?')) return;
    await fetch(`/api/students/${id}/fee-items?item=${itemId}`, { method: 'DELETE' });
    load();
  }

  async function toggleStatus() {
    const next = (student.status || 'Active') === 'Active' ? 'Closed' : 'Active';
    if (!confirm(`Mark ${student.name} as ${next}?`)) return;
    await fetch(`/api/students/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    setMenuOpen(false);
    load();
  }

  async function deleteStudent() {
    if (!confirm(`Delete ${student.name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/students');
    else alert((await res.json()).error || 'Failed to delete.');
  }

  if (loading) return <div className="text-sm text-textSecondary">Loading profile...</div>;
  if (!student) return <div className="text-sm text-textSecondary">Student not found.</div>;

  const totalDue = fees.reduce((sum, f) => sum + (Number(f.remaining_due) || 0), 0);
  const totalPaid = fees.reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0);
  const waNum = intlDigits(student.alt_mobile || student.mobile);
  const telNum = intlDigits(student.mobile);
  const isActive = (student.status || 'Active') === 'Active';

  const details: [string, any][] = [
    ["Father's name", student.father_name],
    ["Mother's name", student.mother_name],
    ['Mobile', student.mobile],
    ['WhatsApp number', student.alt_mobile],
    ['Date of birth', student.dob],
    ['Gender', student.gender],
    ['Qualification', student.qualification],
    ['Course', student.course],
    ['Batch', student.batch_name],
    ['Admission date', student.admission_date],
    ['Roll number', student.roll_number],
    ['Registration number', student.registration_number],
    ['Aadhaar', student.aadhaar],
    ['Email', student.email],
    ['Address', student.address],
    ['Remarks', student.remarks],
  ];

  const menuItems: { icon: string; label: string; hint: string; onClick: () => void; danger?: boolean }[] = [
    { icon: 'edit', label: 'Edit Student', hint: 'Edit this student profile', onClick: () => router.push(`/students?edit=${id}`) },
    {
      icon: isActive ? 'person_off' : 'how_to_reg',
      label: isActive ? 'Close' : 'Activate',
      hint: 'Change active / closed status',
      onClick: toggleStatus,
    },
    { icon: 'delete', label: 'Delete student', hint: 'Delete this student profile', onClick: deleteStudent, danger: true },
    {
      icon: 'description',
      label: 'Generate Report',
      hint: 'Report card with exam results',
      onClick: () => window.open(`/api/students/${id}/report-card`, '_blank'),
    },
    { icon: 'assignment', label: 'Registration Form', hint: 'Printable registration form', onClick: () => window.print() },
    {
      icon: 'receipt_long',
      label: 'Fee Summary',
      hint: 'Collected fees and pending dues',
      onClick: () => document.getElementById('fee-history')?.scrollIntoView({ behavior: 'smooth' }),
    },
    { icon: 'badge', label: 'Generate ID card', hint: 'Printable student ID card', onClick: () => window.open(`/api/students/${id}/id-card`, '_blank') },
  ];

  return (
    <div className="space-y-5 print:space-y-3" id="student-profile">
      <style>{`@media print { aside, header, .no-print { display: none !important; } main { margin: 0 !important; } }`}</style>

      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <Link href="/students" className="text-tertiary text-sm font-medium hover:underline flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to students
        </Link>
        <div className="flex items-center gap-2 relative">
          <button onClick={openCollect} className="btn btn-primary">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Collect fee
          </button>
          <button onClick={() => setMenuOpen((o) => !o)} className="btn btn-outline" title="Student menu">
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-40 bg-surface-container rounded-xl shadow-lg border border-outline-variant/40 w-72 max-w-[85vw] overflow-hidden">
                <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center justify-between">
                  <span className="text-sm font-semibold text-on-surface">Students Menu</span>
                  <button onClick={() => setMenuOpen(false)}>
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">close</span>
                  </button>
                </div>
                {menuItems.map((m) => (
                  <button
                    key={m.label}
                    onClick={() => {
                      setMenuOpen(false);
                      m.onClick();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-high text-left"
                  >
                    <span className={`material-symbols-outlined text-[20px] ${m.danger ? 'text-red-500' : 'text-primary'}`}>{m.icon}</span>
                    <span>
                      <span className={`block text-sm font-medium ${m.danger ? 'text-red-500' : 'text-on-surface'}`}>{m.label}</span>
                      <span className="block text-[11px] text-on-surface-variant">{m.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
        {student.photo ? (
          <img src={student.photo} alt={student.name} className="w-24 h-24 rounded-xl object-cover border border-border shrink-0" />
        ) : (
          <div className="w-24 h-24 rounded-xl bg-surface-container-high text-tertiary flex items-center justify-center text-3xl font-semibold shrink-0">
            {String(student.name || '?').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <h1 className="text-[24px] font-semibold tracking-tight text-on-surface">{student.name}</h1>
            <Badge tone={isActive ? 'green' : 'gray'}>{student.status || 'Active'}</Badge>
          </div>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {[student.course, student.batch_name].filter(Boolean).join(' · ') || 'No course assigned'}
          </p>
          <div className="flex gap-2 mt-3 flex-wrap items-center justify-center sm:justify-start">
            {student.roll_number && <Badge tone="blue">Roll: {student.roll_number}</Badge>}
            {totalDue > 0 ? <Badge tone="red">Due: {formatCurrency(totalDue)}</Badge> : <Badge tone="green">No dues</Badge>}
            <span className="flex items-center gap-2 ml-1 no-print">
              {waNum && (
                <a
                  href={`https://wa.me/${waNum}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="WhatsApp"
                  className="text-green-600 hover:scale-110 transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                </a>
              )}
              {telNum && (
                <>
                  <a href={`sms:+${telNum}`} title="SMS" className="text-tertiary hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">sms</span>
                  </a>
                  <a href={`tel:+${telNum}`} title="Call" className="text-tertiary hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">call</span>
                  </a>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Fee plan (Assign Batch & Fee) */}
      <div className="card no-print">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">request_quote</span>
            Fee Plan
          </span>
          <button
            onClick={() => {
              // Default the billing start to the BATCH's start date, not the
              // student's join date — a late joiner still owes for the months
              // that already elapsed since the batch began (the fee covers
              // the whole batch, not just time-since-enrollment).
              setPlan({ fee_type: 'Monthly', partial_supported: false, from_date: student.batch_start_date || '' });
              setPlanOpen(true);
            }}
            className="btn btn-outline !py-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add fee item
          </button>
        </div>
        {feeItems.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            No fee items yet. Add one (e.g. Monthly 1500) so collections can auto-advance month by month.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {feeItems.map((fi) => (
              <div key={fi.id} className="border border-outline-variant/40 rounded-xl px-4 py-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-on-surface">
                    {formatCurrency(fi.amount)} <span className="text-on-surface-variant font-normal">· {fi.fee_type}</span>
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {fi.category || 'Default Fee'} · from {fi.from_date || '-'}
                    {fi.partial_supported ? ' · partial allowed' : ''}
                  </p>
                </div>
                <button onClick={() => removeFeeItem(fi.id)} className="text-on-surface-variant hover:text-red-500" title="Remove">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="text-[13px] font-semibold text-on-surface mb-3">Student details</div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
          {details.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 text-sm border-b border-outline-variant/20 pb-1.5">
              <dt className="text-on-surface-variant">{label}</dt>
              <dd className="text-on-surface text-right">{value || '-'}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Attendance calendar (colour-coded) */}
      <div className="no-print">
        <AttendanceCalendar studentKey={id} />
      </div>

      <StudentDocuments studentId={id} />

      <div className="card p-0 overflow-x-auto" id="fee-history">
        <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-on-surface">Collected Fees</span>
          <span className="text-xs text-on-surface-variant">
            Paid {formatCurrency(totalPaid)} · Due {formatCurrency(totalDue)}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 text-left">
              {['Date', 'Period', 'Fee', 'Paid', 'Discount', 'Due', 'Mode', 'Receipt'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fees.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-on-surface-variant text-sm">
                  No fee records yet.
                </td>
              </tr>
            ) : (
              fees.map((f) => (
                <tr key={f.id} className="border-b border-outline-variant/25 last:border-0">
                  <td className="px-4 py-2.5">{f.payment_date || '-'}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {f.period_from ? `${f.period_from} → ${f.period_to || '-'}` : '-'}
                  </td>
                  <td className="px-4 py-2.5">{formatCurrency(f.course_fee)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(f.amount_paid)}</td>
                  <td className="px-4 py-2.5">{f.discount ? formatCurrency(f.discount) : '-'}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={f.remaining_due > 0 ? 'red' : 'green'}>{formatCurrency(f.remaining_due)}</Badge>
                  </td>
                  <td className="px-4 py-2.5">{f.payment_mode || '-'}</td>
                  <td className="px-4 py-2.5">{f.receipt_number || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Collect fee modal */}
      <Modal open={collectOpen} onClose={() => setCollectOpen(false)} title={`Collect fee — ${student.name}`}>
        <form onSubmit={saveCollect} className="space-y-3">
          {collect.feeType && (
            <div className="text-xs text-on-surface-variant bg-surface-container-high rounded-lg px-3 py-2">
              {collect.feeType} plan
              {collect.periodsElapsed > 1 ? (
                <span className="text-red-500 font-medium">
                  {' '}
                  · {collect.periodsElapsed} months due ({collect.period_from} → {collect.period_to})
                </span>
              ) : collect.period_from ? (
                ` · period ${collect.period_from} → ${collect.period_to}`
              ) : (
                ''
              )}
              {collect.partialSupported ? ' · partial payment allowed' : ''}
            </div>
          )}
          <div className="flex flex-wrap -mx-1.5">
            <label className="block min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
              <span className="text-xs text-on-surface-variant">Receipt no</span>
              <input className="input" value={collect.receipt_number || ''} onChange={(e) => setCollect({ ...collect, receipt_number: e.target.value })} />
            </label>
            <label className="block min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
              <span className="text-xs text-on-surface-variant">Payment date</span>
              <input type="date" className="input" value={collect.payment_date || ''} onChange={(e) => setCollect({ ...collect, payment_date: e.target.value })} />
            </label>
            <label className="block min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
              <span className="text-xs text-on-surface-variant">Period from</span>
              <input type="date" className="input" value={collect.period_from || ''} onChange={(e) => setCollect({ ...collect, period_from: e.target.value })} />
            </label>
            <label className="block min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
              <span className="text-xs text-on-surface-variant">Period to</span>
              <input type="date" className="input" value={collect.period_to || ''} onChange={(e) => setCollect({ ...collect, period_to: e.target.value })} />
            </label>
            <label className="block min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
              <span className="text-xs text-on-surface-variant">Paid amount</span>
              <input type="number" step="any" required className="input" value={collect.amount_paid ?? ''} onChange={(e) => setCollect({ ...collect, amount_paid: e.target.value })} />
            </label>
            <label className="block min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
              <span className="text-xs text-on-surface-variant">Discount</span>
              <input type="number" step="any" className="input" value={collect.discount ?? 0} onChange={(e) => setCollect({ ...collect, discount: e.target.value })} />
            </label>
            <label className="block min-w-0 box-border px-1.5 mb-4 w-full">
              <span className="text-xs text-on-surface-variant">Payment mode</span>
              <select className="input" value={collect.payment_mode || 'Cash'} onChange={(e) => setCollect({ ...collect, payment_mode: e.target.value })}>
                {['Cash', 'UPI', 'Bank Transfer', 'Cheque'].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 box-border px-1.5 mb-4 w-full">
              <span className="text-xs text-on-surface-variant">Remarks</span>
              <input className="input" value={collect.remarks || ''} onChange={(e) => setCollect({ ...collect, remarks: e.target.value })} />
            </label>
          </div>
          <div className="flex items-center justify-between bg-surface-container-high rounded-lg px-3 py-2 text-sm">
            <span className="text-on-surface-variant">Collected Fees And Discount</span>
            <span className="font-semibold text-on-surface">
              {formatCurrency(Number(collect.amount_paid) || 0)} · {formatCurrency(Number(collect.discount) || 0)}
            </span>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? 'Saving...' : 'Add Fee'}
          </button>
        </form>
      </Modal>

      {/* Add fee item modal */}
      <Modal open={planOpen} onClose={() => setPlanOpen(false)} title="Add fee item">
        <form onSubmit={savePlan} className="space-y-3">
          <label className="block">
            <span className="text-xs text-on-surface-variant">Fee category</span>
            <select
              className="input"
              value={plan.category || ''}
              onChange={(e) => {
                const cat = categories.find((c) => c.name === e.target.value);
                setPlan({ ...plan, category: e.target.value, amount: cat && Number(cat.amount) > 0 ? cat.amount : plan.amount });
              }}
            >
              <option value="">Select fee category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                  {Number(c.amount) > 0 ? ` (${c.amount})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-on-surface-variant">Fee type</span>
            <select className="input" value={plan.fee_type} onChange={(e) => setPlan({ ...plan, fee_type: e.target.value })}>
              {FEE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap -mx-1.5">
            <label className="block min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
              <span className="text-xs text-on-surface-variant">From</span>
              <input type="date" className="input" value={plan.from_date || ''} onChange={(e) => setPlan({ ...plan, from_date: e.target.value })} />
            </label>
            <label className="block min-w-0 box-border px-1.5 mb-4 w-full sm:w-1/2">
              <span className="text-xs text-on-surface-variant">Fee amount</span>
              <input type="number" step="any" required className="input" value={plan.amount ?? ''} onChange={(e) => setPlan({ ...plan, amount: e.target.value })} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={!!plan.partial_supported}
              onChange={(e) => setPlan({ ...plan, partial_supported: e.target.checked })}
            />
            Partial Fee Supported
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? 'Saving...' : 'Save'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
