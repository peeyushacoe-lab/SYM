'use client';

import { useEffect, useRef, useState } from 'react';

const DOC_TYPES = ['Aadhaar Card', 'Marksheet', 'Certificate', 'ID Proof', 'Other'];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function StudentDocuments({ studentId }: { studentId: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    fetch(`/api/students/${studentId}/documents`)
      .then((r) => r.json())
      .then((d) => setDocs(d.items || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch(`/api/students/${studentId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_type: docType, file_name: file.name, mime_type: file.type, data_url: dataUrl }),
      });
      if (res.ok) load();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDelete(doc: any) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    await fetch(`/api/students/${studentId}/documents/${doc.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-semibold text-on-surface">Documents</div>
        <div className="flex items-center gap-2 no-print">
          <select className="input !py-1.5 !text-xs" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn btn-outline text-xs px-3 py-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">upload_file</span>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFile} />
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-textSecondary py-4 text-center">Loading...</div>
      ) : docs.length === 0 ? (
        <div className="text-xs text-textSecondary py-4 text-center">No documents uploaded yet.</div>
      ) : (
        <div className="divide-y divide-outline-variant/20">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 py-2.5">
              <span className="material-symbols-outlined text-[20px] text-primary">description</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-on-surface truncate">{doc.file_name}</div>
                <div className="text-[11px] text-textSecondary">
                  {doc.doc_type} · {new Date(doc.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>
              <a
                href={`/api/students/${studentId}/documents/${doc.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-textSecondary hover:text-tertiary no-print"
                title="View"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
              </a>
              <button onClick={() => handleDelete(doc)} className="text-textSecondary hover:text-danger no-print" title="Delete">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
