'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';

const emptyForm = {
  student_id: '', student_label: '', name: '', course: '', graduation_year: '',
  mobile: '', email: '', current_occupation: '', current_organization: '', address: '', remarks: '',
};

export default function AlumniPage() {
  const [alumni, setAlumni] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);

  function loadAlumni() {
    fetch(`/api/alumni?search=${encodeURIComponent(search)}`).then((r) => r.json()).then((d) => setAlumni(d.items || []));
  }

  useEffect(() => { loadAlumni(); }, [search]);

  useEffect(() => {
    if (!studentQuery.trim()) { setStudentResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/students?search=${encodeURIComponent(studentQuery)}`)
        .then((r) => r.json())
        .then((d) => setStudentResults((d.items || []).slice(0, 8)));
    }, 250);
    return () => clearTimeout(t);
  }, [studentQuery]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setStudentQuery('');
    setStudentResults([]);
    setModal(true);
  }

  function openEdit(a: any) {
    setEditing(a);
    setForm({
      student_id: a.student_id ? String(a.student_id) : '', student_label: '',
      name: a.name, course: a.course || '', graduation_year: a.graduation_year || '',
      mobile: a.mobile || '', email: a.email || '', current_occupation: a.current_occupation || '',
      current_organization: a.current_organization || '', address: a.address || '', remarks: a.remarks || '',
    });
    setError('');
    setModal(true);
  }

  function pickStudent(s: any) {
    setForm({
      ...form, student_id: String(s.id), student_label: s.name,
      name: s.name, course: s.course || form.course,
    });
    setStudentResults([]);
    setStudentQuery('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    const url = editing ? `/api/alumni/${editing.id}` : '/api/alumni';
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || 'Could not save alumnus.'); return; }
    setModal(false);
    loadAlumni();
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this alumnus record?')) return;
    await fetch(`/api/alumni/${id}`, { method: 'DELETE' });
    loadAlumni();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium text-text">Alumni</h1>
          <p className="text-xs text-textSecondary mt-0.5">Past students and their current whereabouts</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="input" placeholder="Search alumni..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button onClick={openNew} className="btn btn-primary">+ Add alumnus</button>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-container-low/60 text-left">
              {['Name', 'Course', 'Grad. year', 'Occupation', 'Organization', 'Contact', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alumni.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-textSecondary text-sm">No alumni records yet.</td></tr>
            ) : (
              alumni.map((a) => (
                <tr key={a.id} className="border-b border-borderLight last:border-0">
                  <td className="px-4 py-2.5 font-medium">{a.name}</td>
                  <td className="px-4 py-2.5">{a.course || '-'}</td>
                  <td className="px-4 py-2.5">{a.graduation_year || '-'}</td>
                  <td className="px-4 py-2.5">{a.current_occupation || '-'}</td>
                  <td className="px-4 py-2.5">{a.current_organization || '-'}</td>
                  <td className="px-4 py-2.5 text-textSecondary">{a.mobile || a.email || '-'}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(a)} className="text-tertiary text-xs font-medium hover:underline mr-3">Edit</button>
                    <button onClick={() => handleDelete(a.id)} className="text-danger text-xs font-medium hover:underline">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit alumnus' : 'Add alumnus'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="text-sm text-danger">{error}</div>}
          {!editing && (
            <div className="relative">
              <label className="label">Link to existing student (optional)</label>
              {form.student_id ? (
                <div className="input flex items-center justify-between">
                  <span>{form.student_label}</span>
                  <button type="button" onClick={() => setForm({ ...form, student_id: '', student_label: '' })} className="text-xs text-tertiary">Change</button>
                </div>
              ) : (
                <>
                  <input className="input" placeholder="Search student to prefill..." value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} />
                  {studentResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {studentResults.map((s) => (
                        <button type="button" key={s.id} onClick={() => pickStudent(s)} className="block w-full text-left px-3 py-2 text-sm hover:bg-surface-container-low/60">
                          {s.name} <span className="text-textSecondary text-xs">{s.course || '-'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name *</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Course</label>
              <input className="input" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Graduation year</label>
              <input className="input" placeholder="e.g. 2023" value={form.graduation_year} onChange={(e) => setForm({ ...form, graduation_year: e.target.value })} />
            </div>
            <div>
              <label className="label">Mobile</label>
              <input className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Current occupation</label>
              <input className="input" value={form.current_occupation} onChange={(e) => setForm({ ...form, current_occupation: e.target.value })} />
            </div>
            <div>
              <label className="label">Current organization</label>
              <input className="input" value={form.current_organization} onChange={(e) => setForm({ ...form, current_organization: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea className="input" rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving...' : editing ? 'Save changes' : 'Add alumnus'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
