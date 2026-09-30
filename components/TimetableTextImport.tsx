'use client';

import { useState } from 'react';
import Modal from './Modal';
import { parseTimetableText, ParsedSlot } from '@/lib/timetableTextParser';
import { DAY_NAMES } from './portal/TimetableGrid';

const EXAMPLE = `Monday
9:00-10:00 Physics Sharma
10:00-11:00 Chemistry Rao

Tuesday
9-10 Physics, 10-11 Maths with Singh`;

export default function TimetableTextImport({
  open,
  onClose,
  onDone,
  batchId,
  teachers,
  subjects,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  batchId: string;
  teachers: { id: number; name: string }[];
  subjects: { name: string }[];
}) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<ParsedSlot[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsed, setParsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setText('');
    setRows([]);
    setParseErrors([]);
    setParsed(false);
    setError('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function parse() {
    const subjectNames = subjects.map((s) => s.name);
    const teacherNames = teachers.map((t) => t.name);
    const { slots, errors } = parseTimetableText(text, subjectNames, teacherNames);
    setRows(slots);
    setParseErrors(errors);
    setParsed(true);
  }

  function updateRow(idx: number, patch: Partial<ParsedSlot>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function teacherIdFor(name: string | null): number | undefined {
    if (!name) return undefined;
    const match = teachers.find((t) => t.name.toLowerCase() === name.toLowerCase());
    return match?.id;
  }

  async function submit() {
    setSaving(true);
    setError('');
    const res = await fetch('/api/timetable/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_id: Number(batchId),
        slots: rows.map((r) => ({
          day: r.day,
          start_time: r.start_time,
          end_time: r.end_time,
          subject: r.subject,
          teacher_user_id: teacherIdFor(r.teacher_name),
        })),
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(d.error || 'Failed to import.');
      return;
    }
    reset();
    onDone();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Paste timetable">
      {!parsed ? (
        <div className="space-y-4">
          <div className="text-[13px] text-on-surface-variant">
            Paste your schedule as plain text — one day name on its own line, then a line per class as{' '}
            <b>time  subject  teacher</b> (in any order after the time). Multiple classes can go on one line
            separated by commas. This is parsed locally — no AI, no cost.
          </div>
          <textarea
            className="input font-mono text-xs"
            rows={10}
            placeholder={EXAMPLE}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <div className="flex justify-between">
            <button type="button" className="btn btn-outline" onClick={handleClose}>Cancel</button>
            <button type="button" disabled={!text.trim()} className="btn btn-primary" onClick={parse}>
              Parse
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {error && <div className="text-sm text-danger bg-dangerLight border border-dangerBorder rounded-lg px-3 py-2">{error}</div>}
          {parseErrors.length > 0 && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
              {parseErrors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
          {rows.length === 0 ? (
            <div className="text-sm text-textSecondary">No class slots could be parsed. Go back and check the format.</div>
          ) : (
            <div className="border border-outline-variant/50 rounded-lg max-h-80 overflow-y-auto">
              {rows.map((r, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-outline-variant/25 last:border-0">
                  <select className="input !w-auto !py-1 text-xs" value={r.day} onChange={(e) => updateRow(i, { day: Number(e.target.value) })}>
                    {DAY_NAMES.map((d, idx) => <option key={d} value={idx}>{d}</option>)}
                  </select>
                  <input type="time" className="input !w-auto !py-1 text-xs" value={r.start_time} onChange={(e) => updateRow(i, { start_time: e.target.value })} />
                  <span className="text-xs text-textSecondary">to</span>
                  <input type="time" className="input !w-auto !py-1 text-xs" value={r.end_time || ''} onChange={(e) => updateRow(i, { end_time: e.target.value })} />
                  <input className="input !w-auto !py-1 text-xs flex-1 min-w-[100px]" value={r.subject} onChange={(e) => updateRow(i, { subject: e.target.value })} placeholder="Subject" />
                  <select
                    className="input !w-auto !py-1 text-xs"
                    value={teacherIdFor(r.teacher_name) || ''}
                    onChange={(e) => {
                      const t = teachers.find((tt) => tt.id === Number(e.target.value));
                      updateRow(i, { teacher_name: t ? t.name : null });
                    }}
                  >
                    <option value="">No teacher</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <button type="button" onClick={() => removeRow(i)} className="text-danger text-xs ml-auto">Remove</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between pt-2">
            <button type="button" className="btn btn-outline" onClick={() => setParsed(false)}>Back</button>
            <button type="button" disabled={saving || rows.length === 0} onClick={submit} className="btn btn-primary">
              {saving ? 'Importing...' : `Import ${rows.length} slot${rows.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
