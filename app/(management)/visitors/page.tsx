'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';

const emptyForm = { visitor_name: '', mobile: '', purpose: '', to_meet: '', remarks: '' };

function formatTime(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function VisitorsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/visitors').then((r) => r.json()).then((d) => setItems(d.items || []));
  }

  useEffect(load, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/visitors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    setOpen(false);
    setForm(emptyForm);
    load();
  }

  async function handleCheckout(id: number) {
    await fetch(`/api/visitors/${id}/checkout`, { method: 'POST' });
    load();
  }

  const insideNow = items.filter((v) => !v.out_time);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium text-text">Visitor log</h1>
          <p className="text-xs text-textSecondary mt-0.5">Gate entries — check in and check out visitors</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn btn-primary">+ Log visitor</button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card !py-3">
          <div className="text-[11px] uppercase text-textSecondary">Currently inside</div>
          <div className="text-xl font-semibold text-text mt-1">{insideNow.length}</div>
        </div>
        <div className="card !py-3">
          <div className="text-[11px] uppercase text-textSecondary">Logged today</div>
          <div className="text-xl font-semibold text-text mt-1">
            {items.filter((v) => (v.in_time || '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length}
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-container-low/60 text-left">
              {['Visitor', 'Purpose', 'To meet', 'In time', 'Out time', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-textSecondary text-sm">No visitors logged yet.</td></tr>
            ) : (
              items.map((v) => (
                <tr key={v.id} className="border-b border-borderLight last:border-0">
                  <td className="px-4 py-2.5 font-medium">{v.visitor_name} <span className="text-textSecondary text-xs">{v.mobile ? `(${v.mobile})` : ''}</span></td>
                  <td className="px-4 py-2.5">{v.purpose || '-'}</td>
                  <td className="px-4 py-2.5">{v.to_meet || '-'}</td>
                  <td className="px-4 py-2.5 text-textSecondary">{formatTime(v.in_time)}</td>
                  <td className="px-4 py-2.5">
                    {v.out_time ? <span className="text-textSecondary">{formatTime(v.out_time)}</span> : <Badge tone="green">Inside</Badge>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!v.out_time && (
                      <button onClick={() => handleCheckout(v.id)} className="text-tertiary text-xs font-medium hover:underline">Check out</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Log visitor">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Visitor name *</label>
            <input className="input" required value={form.visitor_name} onChange={(e) => setForm({ ...form, visitor_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mobile</label>
              <input className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>
            <div>
              <label className="label">To meet</label>
              <input className="input" placeholder="Staff/teacher name" value={form.to_meet} onChange={(e) => setForm({ ...form, to_meet: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Purpose</label>
            <input className="input" placeholder="e.g. Admission enquiry" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea className="input" rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Logging...' : 'Check in'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
