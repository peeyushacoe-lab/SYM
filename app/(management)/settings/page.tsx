'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';

type Tab = 'account' | 'teachers' | 'guardians' | 'students' | 'backup';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('account');

  return (
    <div>
      <div className="flex items-center gap-1 mb-5 border-b border-border">
        {(
          [
            ['account', 'My account'],
            ['teachers', 'Teacher accounts'],
            ['guardians', 'Guardian accounts'],
            ['students', 'Student accounts'],
            ['backup', 'Backup'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3.5 py-2 text-sm -mb-px border-b-2 transition ${
              tab === key ? 'border-primary text-primary font-medium' : 'border-transparent text-textSecondary hover:text-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'account' && <AccountTab />}
      {tab === 'teachers' && <UsersTab role="teacher" />}
      {tab === 'guardians' && <UsersTab role="guardian" />}
      {tab === 'students' && <UsersTab role="student" />}
      {tab === 'backup' && <BackupTab />}
    </div>
  );
}

function AccountTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setError('');
    const res = await fetch('/api/settings/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setMsg('Password updated successfully.');
    setCurrentPassword('');
    setNewPassword('');
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-sm space-y-4">
      <div className="text-[13px] font-medium text-text">Change password</div>
      {msg && <div className="text-sm text-accent bg-accentLight border border-accentBorder rounded-lg px-3 py-2">{msg}</div>}
      {error && <div className="text-sm text-danger bg-dangerLight border border-dangerBorder rounded-lg px-3 py-2">{error}</div>}
      <div>
        <label className="label">Current password</label>
        <input className="input" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
      </div>
      <div>
        <label className="label">New password</label>
        <input className="input" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-primary">
        Update password
      </button>
    </form>
  );
}

function BackupTab() {
  async function download() {
    const res = await fetch('/api/settings/backup');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sym-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card max-w-sm space-y-3">
      <div className="text-[13px] font-medium text-text">Export data</div>
      <p className="text-sm text-textSecondary">
        Download a full backup of students, batches, staff, enquiries, fees and expenses as a JSON file.
      </p>
      <button onClick={download} className="btn btn-primary">
        Download backup
      </button>
    </div>
  );
}

const roleConfig: Record<string, { label: string; addLabel: string }> = {
  teacher: { label: 'Teachers', addLabel: 'Add teacher' },
  guardian: { label: 'Guardians', addLabel: 'Add guardian' },
  student: { label: 'Student accounts', addLabel: 'Add student account' },
};

function UsersTab({ role }: { role: 'teacher' | 'guardian' | 'student' }) {
  const [items, setItems] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ username: '', password: '', name: '', mobile: '', email: '' });
  const [selectedBatchIds, setSelectedBatchIds] = useState<number[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/api/users?role=${role}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }

  useEffect(() => {
    load();
    fetch('/api/batches').then((r) => r.json()).then((d) => setBatches(d.items || []));
    fetch('/api/students').then((r) => r.json()).then((d) => setStudents(d.items || []));
  }, [role]);

  function openAdd() {
    setForm({ username: '', password: '', name: '', mobile: '', email: '' });
    setSelectedBatchIds([]);
    setSelectedStudentIds([]);
    setSelectedStudentId('');
    setError('');
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body: any = { ...form, role };
    if (role === 'teacher') body.batch_ids = selectedBatchIds;
    if (role === 'guardian') body.student_ids = selectedStudentIds;
    if (role === 'student') body.student_id = selectedStudentId;

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Failed to save.');
      return;
    }
    setOpen(false);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this account?')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    load();
  }

  const cfg = roleConfig[role];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-medium text-text">{cfg.label}</div>
        <button onClick={openAdd} className="btn btn-primary">
          + {cfg.addLabel}
        </button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Name</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Username</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">
                {role === 'teacher' ? 'Batches' : role === 'guardian' ? 'Children' : 'Linked student'}
              </th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase">Status</th>
              <th className="px-4 py-2.5 text-[11px] text-textSecondary uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-textSecondary text-sm">
                  No accounts yet.
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.id} className="border-b border-borderLight last:border-0">
                  <td className="px-4 py-2.5">{u.name}</td>
                  <td className="px-4 py-2.5">{u.username}</td>
                  <td className="px-4 py-2.5">
                    {role === 'teacher' && (u.batches?.map((b: any) => b.name).join(', ') || '-')}
                    {role === 'guardian' && (u.students?.map((s: any) => s.name).join(', ') || '-')}
                    {role === 'student' && (u.student?.name || '-')}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={u.active ? 'green' : 'gray'}>{u.active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => handleDelete(u.id)} className="text-danger text-xs font-medium hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={cfg.addLabel}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="text-sm text-danger bg-dangerLight border border-dangerBorder rounded-lg px-3 py-2">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full name *</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Username *</label>
              <input className="input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <label className="label">Password *</label>
              <input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="label">Mobile</label>
              <input className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          {role === 'teacher' && (
            <div>
              <label className="label">Assign batches</label>
              <select
                multiple
                className="input h-28"
                value={selectedBatchIds.map(String)}
                onChange={(e) =>
                  setSelectedBatchIds(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))
                }
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-textLight mt-1">Hold Ctrl/Cmd to select multiple batches.</p>
            </div>
          )}

          {role === 'guardian' && (
            <div>
              <label className="label">Link children</label>
              <select
                multiple
                className="input h-28"
                value={selectedStudentIds.map(String)}
                onChange={(e) =>
                  setSelectedStudentIds(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))
                }
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.mobile})
                  </option>
                ))}
              </select>
              <p className="text-xs text-textLight mt-1">Hold Ctrl/Cmd to select multiple children.</p>
            </div>
          )}

          {role === 'student' && (
            <div>
              <label className="label">Link to student record *</label>
              <select
                className="input"
                required
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              >
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.mobile})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Create account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
