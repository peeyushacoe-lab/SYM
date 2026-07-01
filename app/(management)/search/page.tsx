'use client';

import { useState } from 'react';
import Badge from '@/components/Badge';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ students: any[]; enquiries: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch(query: string) {
    setQ(query);
    if (!query) {
      setResults(null);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    setResults(await res.json());
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <input
        className="input max-w-md"
        placeholder="Search students, enquiries, batches..."
        value={q}
        onChange={(e) => runSearch(e.target.value)}
        autoFocus
      />

      {loading && <div className="text-sm text-textSecondary">Searching...</div>}

      {results && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <div className="text-[13px] font-medium text-text mb-3">Students ({results.students.length})</div>
            {results.students.length === 0 ? (
              <div className="text-sm text-textSecondary">No matching students.</div>
            ) : (
              <div className="space-y-2">
                {results.students.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm border-b border-borderLight pb-2 last:border-0">
                    <div>
                      <div className="text-text">{s.name}</div>
                      <div className="text-xs text-textSecondary">{s.mobile} - {s.batch_name || 'No batch'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="text-[13px] font-medium text-text mb-3">Enquiries ({results.enquiries.length})</div>
            {results.enquiries.length === 0 ? (
              <div className="text-sm text-textSecondary">No matching enquiries.</div>
            ) : (
              <div className="space-y-2">
                {results.enquiries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm border-b border-borderLight pb-2 last:border-0">
                    <div>
                      <div className="text-text">{e.student_name}</div>
                      <div className="text-xs text-textSecondary">{e.mobile}</div>
                    </div>
                    <Badge tone={e.status === 'Joined' ? 'green' : e.status === 'Lost' ? 'red' : 'amber'}>{e.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
