'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';

type Tab = 'account' | 'teachers' | 'guardians' | 'students' | 'admins' | 'fees' | 'sms' | 'backup';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('account');
  const [me, setMe] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setMe(d.user || d))
      .catch(() => {});
  }, []);

  const isSuper = me?.role === 'superadmin';

  // Account creation (students / faculty / admins) is super-admin only.
  const tabs: [Tab, string][] = isSuper
    ? [
        ['account', 'My account'],
        ['students', 'Student accounts'],
        ['teachers', 'Faculty accounts'],
        ['admins', 'Admin accounts'],
        ['guardians', 'Guardian accounts'],
        ['fees', 'Fee categories'],
        ['sms', 'Message templates'],
        ['backup', 'Backup'],
      ]
    : [
        ['account', 'My account'],
        ['fees', 'Fee categories'],
        ['sms', 'Message templates'],
        ['backup', 'Backup'],
      ];

  return (
    <div>
      <div className="flex items-center gap-1 mb-5 border-b border-border flex-wrap">
        {tabs.map(([key, label]) => (
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
      {isSuper && tab === 'teachers' && <UsersTab role="teacher" />}
      {isSuper && tab === 'guardians' && <UsersTab role="guardian" />}
      {isSuper && tab === 'students' && <UsersTab role="student" />}
      {isSuper && tab === 'admins' && <UsersTab role="management" />}
      {tab === 'fees' && <FeeCategoriesTab />}
      {tab === 'sms' && <SmsTemplatesTab />}
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

  const [restoreMsg, setRestoreMsg] = useState('');
  const [restoring, setRestoring] = useState(false);

  async function restore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Restoring will REPLACE all current students, batches, staff, enquiries, fees and expenses with the backup contents. Continue?')) {
      e.target.value = '';
      return;
    }
    setRestoring(true);
    setRestoreMsg('');
    try {
      const text = await file.text();
      const res = await fetch('/api/settings/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });
      const data = await res.json();
      if (!res.ok) {
        setRestoreMsg(data.error || 'Restore failed.');
      } else {
        const total = Object.values(data.counts as Record<string, number>).reduce((a, b) => a + b, 0);
        setRestoreMsg(`Restore complete — ${total} records imported.`);
      }
    } catch {
      setRestoreMsg('Could not read that file.');
    }
    setRestoring(false);
    e.target.value = '';
  }

  return (
    <div className="space-y-4 max-w-sm">
      <div className="card space-y-3">
        <div className="text-[13px] font-semibold text-on-surface">Backup</div>
        <p className="text-sm text-on-surface-variant">
          Download a full backup of students, batches, staff, enquiries, fees and expenses as a JSON file.
        </p>
        <button onClick={download} className="btn btn-primary">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Download backup
        </button>
      </div>

      <div className="card space-y-3">
        <div className="text-[13px] font-semibold text-on-surface">Restore</div>
        <p className="text-sm text-on-surface-variant">
          Upload a previously downloaded backup file to restore your data. This replaces all current records.
        </p>
        <label className="btn btn-outline cursor-pointer w-fit">
          <span className="material-symbols-outlined text-[18px]">upload</span>
          {restoring ? 'Restoring...' : 'Upload backup file'}
          <input type="file" accept="application/json,.json" className="hidden" onChange={restore} disabled={restoring} />
        </label>
        {restoreMsg && (
          <p className={`text-sm ${restoreMsg.startsWith('Restore complete') ? 'text-accent' : 'text-danger'}`}>{restoreMsg}</p>
        )}
      </div>
    </div>
  );
}

const roleConfig: Record<string, { label: string; addLabel: string }> = {
  teacher: { label: 'Faculty', addLabel: 'Add faculty member' },
  guardian: { label: 'Guardians', addLabel: 'Add guardian' },
  student: { label: 'Student accounts', addLabel: 'Add student account' },
  management: { label: 'Admins', addLabel: 'Add admin' },
};

function UsersTab({ role }: { role: 'teacher' | 'guardian' | 'student' | 'management' }) {
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
                {role === 'teacher' ? 'Batches' : role === 'guardian' ? 'Children' : role === 'management' ? 'Role' : 'Linked student'}
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
                    {role === 'management' && 'Admin'}
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


function FeeCategoriesTab() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  function load() {
    fetch('/api/fee-categories')
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }
  useEffect(load, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/fee-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, amount: Number(amount) || 0 }),
    });
    if (!res.ok) {
      setError((await res.json()).error || 'Failed to save.');
      return;
    }
    setName('');
    setAmount('');
    load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this fee category?')) return;
    await fetch(`/api/fee-categories/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-4 max-w-xl">
      <form onSubmit={add} className="card flex items-end gap-3 flex-wrap">
        <label className="block flex-1 min-w-[160px]">
          <span className="text-xs text-on-surface-variant">Category name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 1500 / Default Fee" required />
        </label>
        <label className="block w-32">
          <span className="text-xs text-on-surface-variant">Amount</span>
          <input type="number" step="any" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </label>
        <button className="btn btn-primary">Add category</button>
        {error && <p className="text-sm text-red-500 w-full">{error}</p>}
      </form>
      <div className="card p-0">
        {items.length === 0 ? (
          <p className="p-4 text-sm text-on-surface-variant">No fee categories yet.</p>
        ) : (
          items.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/20 last:border-0">
              <span className="text-sm text-on-surface">{c.name}</span>
              <span className="flex items-center gap-4">
                <span className="text-sm text-on-surface-variant">{Number(c.amount) > 0 ? `Rs. ${Number(c.amount).toLocaleString('en-IN')}` : '-'}</span>
                <button onClick={() => remove(c.id)} className="text-on-surface-variant hover:text-red-500">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </span>
            </div>
          ))
        )}
      </div>
      <p className="text-xs text-on-surface-variant">
        Fee categories appear in the student profile&apos;s &quot;Add fee item&quot; dropdown, like Tufee&apos;s Fee Category settings.
      </p>
    </div>
  );
}

const TEMPLATE_LABELS: Record<string, string> = {
  registration: 'Registration Message',
  fee_reminder: 'Fee Reminder',
  fee_receipt: 'Fee Receipt',
  attendance: 'Attendance',
  exam: 'Exam',
  enquiry: 'Enquiry',
  birthday: 'Birthdays',
};
const TEMPLATE_KEYWORDS = 'STUDENT_NAME, BATCH_NAME, AMOUNT, MONTH, DATE, STATUS, MARKS, EXAM_NAME, RECEIPT_NO, MOBILE, INSTITUTE_NAME';

function SmsTemplatesTab() {
  const [items, setItems] = useState<any[]>([]);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    fetch('/api/sms-templates')
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }, []);

  async function save(key: string, template: string) {
    setSaved('');
    const res = await fetch('/api/sms-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, template }),
    });
    if (res.ok) {
      setSaved(key);
      setTimeout(() => setSaved(''), 1500);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card">
        <p className="text-[13px] font-semibold text-on-surface mb-1">Set message templates</p>
        <p className="text-xs text-on-surface-variant">
          Used when sending WhatsApp/SMS from the app. Keywords: <span className="font-mono">{TEMPLATE_KEYWORDS}</span>
        </p>
      </div>
      {items.map((t) => (
        <div key={t.key} className="card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-on-surface">{TEMPLATE_LABELS[t.key] || t.key}</span>
            {saved === t.key && <span className="text-xs text-green-600">Saved</span>}
          </div>
          <textarea
            className="input min-h-[72px]"
            defaultValue={t.template}
            onBlur={(e) => e.target.value !== t.template && save(t.key, e.target.value)}
          />
          <p className="text-[11px] text-on-surface-variant">Edits save automatically when you click away.</p>
        </div>
      ))}
    </div>
  );
}
