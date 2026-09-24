'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Admin {
  id: number;
  username: string;
  name: string;
  email: string | null;
  mobile: string | null;
  active: number;
  created_at: string;
}

interface Stats {
  students: number; staff: number; batches: number; courses: number;
  subjects: number; teachers: number; exams: number; feeCollectedThisMonth: number; totalDue: number;
}

const emptyAdminForm = { name: '', email: '', mobile: '' };

export default function SchoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [school, setSchool] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', active: true });
  const [savingEdit, setSavingEdit] = useState(false);

  const [adminModal, setAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [adminForm, setAdminForm] = useState<any>(emptyAdminForm);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminResult, setAdminResult] = useState<{ username: string; password: string; emailSent: boolean } | null>(null);

  function load() {
    setLoading(true);
    fetch(`/api/schools/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); throw new Error('not found'); }
        return r.json();
      })
      .then((d) => {
        setSchool(d.school);
        setStats(d.stats);
        setAdmins(d.admins || []);
        setEditForm({ name: d.school.name, active: !!d.school.active });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function saveSchoolEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    await fetch(`/api/schools/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setSavingEdit(false);
    setEditOpen(false);
    load();
  }

  async function deleteSchool() {
    const typed = prompt(
      `This permanently deletes "${school.name}" and every student, staff, fee, exam and record it has — this cannot be undone.\n\nType the school's name to confirm:`
    );
    if (typed !== school.name) return;
    const res = await fetch(`/api/schools/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || 'Failed to delete school.');
      return;
    }
    router.push('/schools');
  }

  function openAddAdmin() {
    setEditingAdmin(null);
    setAdminForm(emptyAdminForm);
    setAdminError('');
    setAdminResult(null);
    setAdminModal(true);
  }

  function openEditAdmin(a: Admin) {
    setEditingAdmin(a);
    setAdminForm({ name: a.name, email: a.email || '', mobile: a.mobile || '', active: !!a.active, password: '' });
    setAdminError('');
    setAdminResult(null);
    setAdminModal(true);
  }

  async function saveAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSavingAdmin(true);
    setAdminError('');
    const url = editingAdmin ? `/api/schools/${id}/admins/${editingAdmin.id}` : `/api/schools/${id}/admins`;
    const method = editingAdmin ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminForm),
    });
    const data = await res.json();
    setSavingAdmin(false);
    if (!res.ok) { setAdminError(data.error || 'Failed to save admin.'); return; }
    if (!editingAdmin) {
      setAdminResult({ username: data.username, password: data.password, emailSent: data.emailSent });
    } else {
      setAdminModal(false);
    }
    load();
  }

  async function deleteAdmin(a: Admin) {
    if (!confirm(`Remove admin login for ${a.name} (${a.username})?`)) return;
    await fetch(`/api/schools/${id}/admins/${a.id}`, { method: 'DELETE' });
    load();
  }

  if (notFound) return <div className="text-sm text-on-surface-variant py-10 text-center">School not found.</div>;
  if (loading || !school) return <div className="text-sm text-on-surface-variant py-10 text-center">Loading...</div>;

  const statCards = stats
    ? [
        { label: 'Students', value: stats.students },
        { label: 'Staff', value: stats.staff },
        { label: 'Teachers', value: stats.teachers },
        { label: 'Batches', value: stats.batches },
        { label: 'Courses', value: stats.courses },
        { label: 'Subjects', value: stats.subjects },
        { label: 'Exams', value: stats.exams },
        { label: 'Fee collected this month', value: `Rs. ${Number(stats.feeCollectedThisMonth).toLocaleString('en-IN')}` },
        { label: 'Total fees due', value: `Rs. ${Number(stats.totalDue).toLocaleString('en-IN')}` },
      ]
    : [];

  return (
    <div>
      <Link href="/schools" className="text-xs text-tertiary hover:underline flex items-center gap-1 mb-3">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        All schools
      </Link>

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">{school.name}</h1>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${school.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
              {school.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">Created {new Date(school.created_at).toLocaleDateString('en-IN')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditOpen(true)} className="btn btn-outline">Edit school</button>
          <button onClick={deleteSchool} className="btn btn-outline text-danger">Delete school</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {statCards.map((c) => (
          <div key={c.label} className="card p-3">
            <div className="text-[11px] text-on-surface-variant uppercase tracking-wide">{c.label}</div>
            <div className="text-lg font-semibold text-on-surface mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-on-surface">Admin accounts</h2>
        <button onClick={openAddAdmin} className="btn btn-primary !py-1.5 !px-3 text-xs">+ Add admin</button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 text-left">
              {['Name', 'Username / Email', 'Mobile', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-textSecondary text-sm">No admin accounts yet.</td></tr>
            ) : (
              admins.map((a) => (
                <tr key={a.id} className="border-b border-outline-variant/25 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-text">{a.name}</td>
                  <td className="px-4 py-2.5">{a.username}</td>
                  <td className="px-4 py-2.5">{a.mobile || '-'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${a.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {a.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => openEditAdmin(a)} className="text-primary text-xs font-medium hover:underline mr-3">Edit</button>
                    <button onClick={() => deleteAdmin(a)} className="text-danger text-xs font-medium hover:underline">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setEditOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={saveSchoolEdit} className="space-y-4">
              <h2 className="text-lg font-semibold">Edit school</h2>
              <div>
                <label className="label">School name</label>
                <input className="input" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} />
                Active
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditOpen(false)} className="btn btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={savingEdit} className="btn btn-primary flex-1">{savingEdit ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {adminModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setAdminModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {adminResult ? (
              <div>
                <h2 className="text-lg font-semibold mb-1">Admin account created</h2>
                <p className="text-sm text-on-surface-variant mb-4">
                  {adminResult.emailSent ? 'Login credentials have been emailed.' : 'Email is not configured yet — share these credentials yourself:'}
                </p>
                <div className="bg-surface-container-high rounded-lg p-3 text-sm space-y-1 mb-4">
                  <div><span className="text-on-surface-variant">Username: </span><b>{adminResult.username}</b></div>
                  <div><span className="text-on-surface-variant">Password: </span><b>{adminResult.password}</b></div>
                </div>
                <button onClick={() => setAdminModal(false)} className="btn btn-primary w-full">Done</button>
              </div>
            ) : (
              <form onSubmit={saveAdmin} className="space-y-4">
                <h2 className="text-lg font-semibold">{editingAdmin ? 'Edit admin' : 'Add a new admin'}</h2>
                {adminError && <div className="text-sm text-danger bg-dangerLight border border-dangerBorder rounded-lg px-3 py-2">{adminError}</div>}
                <div>
                  <label className="label">Name</label>
                  <input className="input" required value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Email {editingAdmin ? '' : '(becomes the username)'}</label>
                  <input
                    className="input"
                    type="email"
                    required={!editingAdmin}
                    disabled={!!editingAdmin}
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  />
                  {editingAdmin && <p className="text-[11px] text-on-surface-variant mt-1">Username can't be changed after creation.</p>}
                </div>
                <div>
                  <label className="label">Mobile</label>
                  <input className="input" type="tel" value={adminForm.mobile} onChange={(e) => setAdminForm({ ...adminForm, mobile: e.target.value })} />
                </div>
                {editingAdmin && (
                  <>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!adminForm.active} onChange={(e) => setAdminForm({ ...adminForm, active: e.target.checked })} />
                      Active
                    </label>
                    <div>
                      <label className="label">Reset password (optional)</label>
                      <input className="input" placeholder="Leave blank to keep current password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} />
                    </div>
                  </>
                )}
                {!editingAdmin && (
                  <p className="text-[11px] text-on-surface-variant">
                    A password is auto-generated and emailed to this address, same as when the school was first created.
                  </p>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAdminModal(false)} className="btn btn-outline flex-1">Cancel</button>
                  <button type="submit" disabled={savingAdmin} className="btn btn-primary flex-1">{savingAdmin ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
