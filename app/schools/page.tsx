'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface School {
  id: number;
  name: string;
  active: number;
  created_at: string;
  student_count: number;
  admin_count: number;
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ username: string; password: string; emailSent: boolean } | null>(null);
  const [form, setForm] = useState({ name: '', admin_email: '', admin_first_name: '', admin_last_name: '' });

  function load() {
    setLoading(true);
    fetch('/api/schools')
      .then((r) => r.json())
      .then((d) => setSchools(d.items || []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Failed to create school.');
      return;
    }
    setResult({ username: data.admin.username, password: data.admin.password, emailSent: data.emailSent });
    setForm({ name: '', admin_email: '', admin_first_name: '', admin_last_name: '' });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">Schools</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">Every school running on this SYM instance</p>
        </div>
        <button
          onClick={() => {
            setResult(null);
            setError('');
            setModalOpen(true);
          }}
          className="btn btn-primary"
        >
          + Add school
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-on-surface-variant py-10 text-center">Loading...</div>
      ) : schools.length === 0 ? (
        <div className="text-sm text-on-surface-variant py-10 text-center border border-dashed border-outline-variant rounded-xl">
          No schools yet. Add the first one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((s) => (
            <Link key={s.id} href={`/schools/${s.id}`} className="card p-4 block hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-on-surface">{s.name}</h3>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {s.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                <span>{s.student_count} students</span>
                <span>{s.admin_count} admin{s.admin_count === 1 ? '' : 's'}</span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2">
                Created {new Date(s.created_at).toLocaleDateString('en-IN')}
              </p>
            </Link>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {result ? (
              <div>
                <h2 className="text-lg font-semibold mb-1">School created</h2>
                <p className="text-sm text-on-surface-variant mb-4">
                  {result.emailSent
                    ? 'Login credentials have been emailed to the admin.'
                    : 'Email is not configured yet (or failed to send) — share these credentials with the admin yourself:'}
                </p>
                <div className="bg-surface-container-high rounded-lg p-3 text-sm space-y-1 mb-4">
                  <div>
                    <span className="text-on-surface-variant">Username: </span>
                    <b>{result.username}</b>
                  </div>
                  <div>
                    <span className="text-on-surface-variant">Password: </span>
                    <b>{result.password}</b>
                  </div>
                </div>
                <button onClick={() => setModalOpen(false)} className="btn btn-primary w-full">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <h2 className="text-lg font-semibold">Add a new school</h2>
                {error && (
                  <div className="text-sm text-danger bg-dangerLight border border-dangerBorder rounded-lg px-3 py-2">{error}</div>
                )}
                <div>
                  <label className="label">School name</label>
                  <input
                    className="input"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Admin email</label>
                  <input
                    className="input"
                    type="email"
                    required
                    value={form.admin_email}
                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Admin first name</label>
                    <input
                      className="input"
                      required
                      value={form.admin_first_name}
                      onChange={(e) => setForm({ ...form, admin_first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Admin last name</label>
                    <input
                      className="input"
                      value={form.admin_last_name}
                      onChange={(e) => setForm({ ...form, admin_last_name: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  This creates the school's admin login automatically (username = the email above) and emails the password.
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                    {saving ? 'Creating...' : 'Create school'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
