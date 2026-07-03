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
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'tel' | 'email' | 'file' | 'checkbox';
  options?: FieldOption[];
  required?: boolean;
  span?: 1 | 2;
  placeholder?: string;
  defaultValue?: string | number;
  // Only render this field when the condition holds for the current form values
  showIf?: (form: Record<string, any>) => boolean;
  // Small helper text under the field
  hint?: string;
}

function readImageAsDataUrl(file: File, maxSize = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  extraQuery = '',
  headerActions,
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
  extraQuery?: string;
  headerActions?: React.ReactNode;
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
    const parts = [];
    if (search) parts.push(`search=${encodeURIComponent(search)}`);
    if (extraQuery) parts.push(extraQuery);
    const q = parts.length ? `?${parts.join('&')}` : '';
    const res = await fetch(`${endpoint}${q}`);
    const data = await res.json();
    setRows(data.items || []);
    setLoading(false);
  }, [endpoint, search, extraQuery]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function openAdd() {
    const initial: Record<string, any> = {};
    fields.forEach((f) => (initial[f.name] = f.defaultValue ?? (f.type === 'checkbox' ? 0 : '')));
    setForm(initial);
    setEditing(null);
    setError('');
    setModalOpen(true);
  }

  function openEdit(row: any) {
    const initial: Record<string, any> = {};
    fields.forEach((f) => (initial[f.name] = row[f.name] ?? f.defaultValue ?? (f.type === 'checkbox' ? 0 : '')));
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
          <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">{title}</h1>
          {subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          {canAdd && (
            <button onClick={openAdd} className="btn btn-primary">
              + {addLabel}
            </button>
          )}
        </div>
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
            <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 text-left">
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
                <tr key={row.id} className="border-b border-outline-variant/25 last:border-0 hover:bg-surface-container-low/70 transition-colors">
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
            {fields.map((f) => {
              if (f.showIf && !f.showIf(form)) return null;
              return (
              <div key={f.name} className={f.span === 2 ? 'col-span-2' : 'col-span-1'}>
                <label className="label">
                  {f.label} {f.required && <span className="text-danger">*</span>}
                </label>
                {f.type === 'checkbox' ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!Number(form[f.name])}
                    onClick={() => setForm({ ...form, [f.name]: Number(form[f.name]) ? 0 : 1 })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      Number(form[f.name]) ? 'bg-tertiary' : 'bg-outline-variant'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        Number(form[f.name]) ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                ) : f.type === 'select' ? (
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
                ) : f.type === 'file' ? (
                  <div className="flex items-center gap-3">
                    {form[f.name] && (
                      <img src={form[f.name]} alt="Preview" className="w-14 h-14 rounded-lg object-cover border border-border" />
                    )}
                    <input
                      className="input"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const dataUrl = await readImageAsDataUrl(file);
                          setForm({ ...form, [f.name]: dataUrl });
                        }
                      }}
                    />
                  </div>
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
                {f.hint && <p className="text-[11px] text-textSecondary mt-1">{f.hint}</p>}
              </div>
              );
            })}
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
