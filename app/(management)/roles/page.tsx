'use client';

import { useEffect, useState } from 'react';

const ROLE_MODULES: Record<string, { key: string; label: string }[]> = {
  teacher: [
    { key: 'batches', label: 'My batches' },
    { key: 'exams', label: 'Exams & marks' },
    { key: 'timetable', label: 'Timetable' },
    { key: 'requests', label: 'Leave requests' },
  ],
  student: [
    { key: 'attendance', label: 'Attendance' },
    { key: 'fees', label: 'Fees & payments' },
    { key: 'results', label: 'Results' },
    { key: 'homework', label: 'Homework' },
    { key: 'timetable', label: 'Timetable' },
    { key: 'requests', label: 'Leave & queries' },
  ],
};

const ROLE_LABELS: Record<string, string> = { teacher: 'Teacher', student: 'Student' };

export default function RolesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState('');

  function load() {
    fetch('/api/role-permissions').then((r) => r.json()).then((d) => setRows(d.items || []));
  }

  useEffect(() => { load(); }, []);

  function isVisible(role: string, moduleKey: string) {
    const row = rows.find((r) => r.role === role && r.module_key === moduleKey);
    return row ? !!row.can_view : true;
  }

  function toggle(role: string, moduleKey: string) {
    const current = isVisible(role, moduleKey);
    const existing = rows.find((r) => r.role === role && r.module_key === moduleKey);
    if (existing) {
      setRows(rows.map((r) => (r === existing ? { ...r, can_view: current ? 0 : 1 } : r)));
    } else {
      setRows([...rows, { role, module_key: moduleKey, can_view: current ? 0 : 1, can_edit: 1 }]);
    }
  }

  async function handleSaveRole(role: string) {
    setSaving(role);
    setSavedMsg('');
    const permissions = ROLE_MODULES[role].map((m) => ({
      module_key: m.key,
      can_view: isVisible(role, m.key),
      can_edit: true,
    }));
    await fetch('/api/role-permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, permissions }),
    });
    setSaving(null);
    setSavedMsg(`${ROLE_LABELS[role]} permissions saved.`);
    load();
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-medium text-text">Roles &amp; Permissions</h1>
        <p className="text-xs text-textSecondary mt-0.5">
          Control which modules are visible to Teacher and Student portal users. Management always has full access.
          The mobile app is management-only, so these settings apply to the web portals only.
        </p>
      </div>

      {savedMsg && <div className="text-sm text-primary mb-3">{savedMsg}</div>}

      <div className="space-y-5">
        {Object.entries(ROLE_MODULES).map(([role, modules]) => (
          <div key={role} className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="text-[13px] font-semibold text-text">{ROLE_LABELS[role]} portal</div>
              <button
                onClick={() => handleSaveRole(role)}
                disabled={saving === role}
                className="btn btn-primary text-xs px-3 py-1.5"
              >
                {saving === role ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div className="divide-y divide-borderLight">
              {modules.map((m) => (
                <label key={m.key} className="flex items-center justify-between px-4 py-3 cursor-pointer">
                  <span className="text-sm text-text">{m.label}</span>
                  <input
                    type="checkbox"
                    checked={isVisible(role, m.key)}
                    onChange={() => toggle(role, m.key)}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
