'use client';

import { useEffect, useState, useCallback } from 'react';
import Modal from './Modal';

export interface FieldOption {
  value: string | number;
  label: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'tel' | 'email';
  options?: FieldOption[];
  required?: boolean;
  span?: 1 | 2;
  placeholder?: string;
}

export interface ColumnDef {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
}

export default function CrudPage({
  title,
  subtitle,
  endpoint,
  columns,
  fields,
  searchPlaceholder = 'Search...',
  addLabel = 'Add new',
  canAdd = true,
  canEdit = true,
  canDelete = true,
  extraActions,
  extraFilters,
}: {
  title: string;
  subtitle?: string;
  endpoint: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  searchPlaceholder?: string;
  addLabel?: string;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  extraActions?: (row: any, reload: () => void) => React.ReactNode;
  extraFilters?: React.ReactNode;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${endpoint}${q}`);
    const data = await res.json();
    setRows(data.items || []);
    setLoading(false);
  }, [endpoint, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function openAdd() {
    const initial: Record<string, any> = {};
    fields.forEach((f) => (initial[f.name] = ''));
    setForm(initial);
    setEditing(null);
    setError('');
    setModalOpen(true);
  }

  function openEdit(row: any) {
    const initial: Record<string, any> = {};
    fields.forEach((f) => (initial[f.name] = row[f.name] ?? ''));
    setForm(initial);
    setEditing(row);
    setError('');
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const url = editing ? `${endpoint}/${editing.id}` : endpoint;
    const method = editing ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to save.');
      setSaving(false);
      return;
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function handleDelete(row: any) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    await fetch(`${endpoint}/${row.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-medium text-text">{title}</h1>
          {subtitle && <p className="text-xs text-textSecondary mt-0.5">{subtitle}</p>}
        </div>
        {canAdd && (
          <button onClick={openAdd} className="btn btn-primary">
            + {addLabel}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <input
          className="input max-w-xs"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {extraFilters}
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              {(canEdit || canDelete || extraActions) && (
                <th className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-textSecondary text-sm">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-textSecondary text-sm">
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-borderLight last:border-0 hover:bg-surface/60">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-2.5 text-text whitespace-nowrap">
                      {c.render ? c.render(row) : row[c.key] ?? '-'}
                    </td>
                  ))}
                  {(canEdit || canDelete || extraActions) && (
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {extraActions && extraActions(row, load)}
                        {canEdit && (
                          <button onClick={() => openEdit(row)} className="text-primary text-xs font-medium hover:underline">
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(row)} className="text-danger text-xs font-medium hover:underline">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${title.replace(/s$/, '')}` : addLabel}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="text-sm text-danger bg-dangerLight border border-dangerBorder rounded-lg px-3 py-2">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.name} className={f.span === 2 ? 'col-span-2' : 'col-span-1'}>
                <label className="label">
                  {f.label} {f.required && <span className="text-danger">*</span>}
                </label>
                {f.type === 'select' ? (
                  <select
                    className="input"
                    required={f.required}
                    value={form[f.name] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    className="input"
                    rows={3}
                    value={form[f.name] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    placeholder={f.placeholder}
                  />
                ) : (
                  <input
                    className="input"
                    type={f.type || 'text'}
                    required={f.required}
                    value={form[f.name] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
