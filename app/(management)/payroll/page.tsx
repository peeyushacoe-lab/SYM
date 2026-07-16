'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

const emptyRun = { staff_id: '', basic_salary: '', allowances: '', deductions: '', remarks: '' };
const emptyPay = { payment_date: new Date().toISOString().slice(0, 10), payment_mode: 'Bank Transfer' };

export default function PayrollPage() {
  const [month, setMonth] = useState(currentMonth());
  const [runs, setRuns] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  const [genModal, setGenModal] = useState(false);
  const [genForm, setGenForm] = useState(emptyRun);
  const [savingGen, setSavingGen] = useState(false);
  const [genError, setGenError] = useState('');

  const [payModal, setPayModal] = useState(false);
  const [payingRun, setPayingRun] = useState<any | null>(null);
  const [payForm, setPayForm] = useState(emptyPay);
  const [savingPay, setSavingPay] = useState(false);

  function loadRuns() {
    fetch(`/api/payroll?month=${month}`).then((r) => r.json()).then((d) => setRuns(d.items || []));
  }
  function loadStaff() {
    fetch('/api/staff').then((r) => r.json()).then((d) => setStaff(d.items || []));
  }

  useEffect(() => { loadRuns(); }, [month]);
  useEffect(() => { loadStaff(); }, []);

  function openGenModal() {
    setGenError('');
    setGenForm(emptyRun);
    setGenModal(true);
  }

  function onSelectStaff(id: string) {
    const s = staff.find((x) => String(x.id) === id);
    setGenForm({ ...genForm, staff_id: id, basic_salary: s ? String(s.salary || 0) : '' });
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!genForm.staff_id) { setGenError('Select a staff member.'); return; }
    setSavingGen(true);
    setGenError('');
    const res = await fetch('/api/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...genForm, month }),
    });
    const d = await res.json();
    setSavingGen(false);
    if (!res.ok) { setGenError(d.error || 'Could not generate payroll run.'); return; }
    setGenModal(false);
    loadRuns();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this payroll run?')) return;
    const res = await fetch(`/api/payroll/${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Could not delete.'); return; }
    loadRuns();
  }

  function openPayModal(run: any) {
    setPayingRun(run);
    setPayForm(emptyPay);
    setPayModal(true);
  }

  async function handleMarkPaid(e: React.FormEvent) {
    e.preventDefault();
    if (!payingRun) return;
    setSavingPay(true);
    await fetch(`/api/payroll/${payingRun.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Paid', ...payForm }),
    });
    setSavingPay(false);
    setPayModal(false);
    loadRuns();
  }

  const totalNet = runs.reduce((sum, r) => sum + Number(r.net_salary || 0), 0);
  const pendingCount = runs.filter((r) => r.status !== 'Paid').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium text-text">Payroll</h1>
          <p className="text-xs text-textSecondary mt-0.5">Generate and track monthly staff salary runs</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button onClick={openGenModal} className="btn btn-primary">+ Generate run</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card px-4 py-3">
          <div className="text-[11px] text-textSecondary uppercase tracking-wide">Runs this month</div>
          <div className="text-lg font-semibold text-text mt-1">{runs.length}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-[11px] text-textSecondary uppercase tracking-wide">Pending payment</div>
          <div className="text-lg font-semibold text-text mt-1">{pendingCount}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-[11px] text-textSecondary uppercase tracking-wide">Total net payout</div>
          <div className="text-lg font-semibold text-text mt-1">Rs. {totalNet.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-container-low/60 text-left">
              {['Staff', 'Basic', 'Allowances', 'Deductions', 'Net salary', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-textSecondary text-sm">No payroll runs generated for this month yet.</td></tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id} className="border-b border-borderLight last:border-0">
                  <td className="px-4 py-2.5 font-medium">{r.staff_name} <span className="text-textSecondary text-xs">{r.staff_designation ? `(${r.staff_designation})` : ''}</span></td>
                  <td className="px-4 py-2.5">Rs. {Number(r.basic_salary).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5">Rs. {Number(r.allowances).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5">Rs. {Number(r.deductions).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5 font-medium">Rs. {Number(r.net_salary).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={r.status === 'Paid' ? 'green' : 'amber'}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {r.status !== 'Paid' && (
                      <>
                        <button onClick={() => openPayModal(r)} className="text-tertiary text-xs font-medium hover:underline mr-3">Mark paid</button>
                        <button onClick={() => handleDelete(r.id)} className="text-danger text-xs font-medium hover:underline">Delete</button>
                      </>
                    )}
                    {r.status === 'Paid' && r.payment_date && (
                      <span className="text-textSecondary text-xs">Paid {r.payment_date}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={genModal} onClose={() => setGenModal(false)} title={`Generate payroll — ${month}`}>
        <form onSubmit={handleGenerate} className="space-y-4">
          {genError && <div className="text-sm text-danger">{genError}</div>}
          <div>
            <label className="label">Staff member *</label>
            <select className="input" required value={genForm.staff_id} onChange={(e) => onSelectStaff(e.target.value)}>
              <option value="">Select staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name} {s.designation ? `(${s.designation})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Basic salary</label>
              <input type="number" min={0} className="input" value={genForm.basic_salary} onChange={(e) => setGenForm({ ...genForm, basic_salary: e.target.value })} />
            </div>
            <div>
              <label className="label">Allowances</label>
              <input type="number" min={0} className="input" value={genForm.allowances} onChange={(e) => setGenForm({ ...genForm, allowances: e.target.value })} />
            </div>
            <div>
              <label className="label">Deductions</label>
              <input type="number" min={0} className="input" value={genForm.deductions} onChange={(e) => setGenForm({ ...genForm, deductions: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea className="input" rows={2} value={genForm.remarks} onChange={(e) => setGenForm({ ...genForm, remarks: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setGenModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={savingGen} className="btn btn-primary">{savingGen ? 'Generating...' : 'Generate run'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={payModal} onClose={() => setPayModal(false)} title="Mark as paid">
        <form onSubmit={handleMarkPaid} className="space-y-4">
          <div>
            <label className="label">Payment date</label>
            <input type="date" className="input" value={payForm.payment_date} onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })} />
          </div>
          <div>
            <label className="label">Payment mode</label>
            <select className="input" value={payForm.payment_mode} onChange={(e) => setPayForm({ ...payForm, payment_mode: e.target.value })}>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPayModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={savingPay} className="btn btn-primary">{savingPay ? 'Saving...' : 'Mark paid'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
