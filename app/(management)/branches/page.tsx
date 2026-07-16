'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';

const emptyForm = { name: '', address: '', contact_mobile: '', contact_email: '', is_main: false, remarks: '' };

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    fetch('/api/branches').then((r) => r.json()).then((d) => setBranches(d.items || []));
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, is_main: branches.length === 0 });
    setError('');
    setModal(true);
  }

  function openEdit(b: any) {
    setEditing(b);
    setForm({ name: b.name, address: b.address || '', contact_mobile: b.contact_mobile || '', contact_email: b.contact_email || '', is_main: !!b.is_main, remarks: b.remarks || '' });
    setError('');
    setModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Branch name is required.'); return; }
    setSaving(true);
    setError('');
    const url = editing ? `/api/branches/${editing.id}` : '/api/branches';
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || 'Could not save branch.'); return; }
    setModal(false);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this branch?')) return;
    const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Could not delete branch.'); return; }
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium text-text">Branches</h1>
          <p className="text-xs text-textSecondary mt-0.5">
            Manage multiple institute branches or locations. (Custom domains per branch require separate DNS/hosting
            setup — ask your developer to configure that when you&apos;re ready to launch a branch-specific domain.)
          </p>
        </div>
        <button onClick={openNew} className="btn btn-primary">+ Add branch</button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-container-low/60 text-left">
              {['Branch', 'Address', 'Contact', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {branches.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-textSecondary text-sm">No branches added yet. Add your main branch to get started.</td></tr>
            ) : (
              branches.map((b) => (
                <tr key={b.id} className="border-b border-borderLight last:border-0">
                  <td className="px-4 py-2.5 font-medium">
                    {b.name} {b.is_main ? <Badge tone="blue">Main</Badge> : null}
                  </td>
                  <td className="px-4 py-2.5">{b.address || '-'}</td>
                  <td className="px-4 py-2.5 text-textSecondary">{b.contact_mobile || b.contact_email || '-'}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(b)} className="text-tertiary text-xs font-medium hover:underline mr-3">Edit</button>
                    {!b.is_main && <button onClick={() => handleDelete(b.id)} className="text-danger text-xs font-medium hover:underline">Delete</button>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit branch' : 'Add branch'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="text-sm text-danger">{error}</div>}
          <div>
            <label className="label">Branch name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contact mobile</label>
              <input className="input" value={form.contact_mobile} onChange={(e) => setForm({ ...form, contact_mobile: e.target.value })} />
            </div>
            <div>
              <label className="label">Contact email</label>
              <input className="input" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={form.is_main} onChange={(e) => setForm({ ...form, is_main: e.target.checked })} />
            Set as main branch
          </label>
          <div>
            <label className="label">Remarks</label>
            <textarea className="input" rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving...' : editing ? 'Save changes' : 'Add branch'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
