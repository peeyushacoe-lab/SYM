'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';

const emptyBook = { title: '', author: '', isbn: '', category: '', total_copies: 1 };
const emptyIssue = { book_id: '', student_id: '', student_label: '', due_date: '' };

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export default function LibraryPage() {
  const [tab, setTab] = useState<'books' | 'issued'>('books');
  const [books, setBooks] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);

  const [bookModal, setBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [bookForm, setBookForm] = useState(emptyBook);
  const [savingBook, setSavingBook] = useState(false);

  const [issueModal, setIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ ...emptyIssue, due_date: defaultDueDate() });
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [savingIssue, setSavingIssue] = useState(false);
  const [issueError, setIssueError] = useState('');

  function loadBooks() {
    fetch('/api/library/books').then((r) => r.json()).then((d) => setBooks(d.items || []));
  }
  function loadIssues() {
    fetch('/api/library/issues').then((r) => r.json()).then((d) => setIssues(d.items || []));
  }

  useEffect(() => {
    loadBooks();
    loadIssues();
  }, []);

  useEffect(() => {
    if (!studentQuery.trim()) { setStudentResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/students?search=${encodeURIComponent(studentQuery)}`)
        .then((r) => r.json())
        .then((d) => setStudentResults((d.items || []).slice(0, 8)));
    }, 250);
    return () => clearTimeout(t);
  }, [studentQuery]);

  function openNewBook() {
    setEditingBook(null);
    setBookForm(emptyBook);
    setBookModal(true);
  }
  function openEditBook(b: any) {
    setEditingBook(b);
    setBookForm({ title: b.title, author: b.author || '', isbn: b.isbn || '', category: b.category || '', total_copies: b.total_copies });
    setBookModal(true);
  }

  async function handleSaveBook(e: React.FormEvent) {
    e.preventDefault();
    setSavingBook(true);
    if (editingBook) {
      await fetch(`/api/library/books/${editingBook.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookForm),
      });
    } else {
      await fetch('/api/library/books', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookForm),
      });
    }
    setSavingBook(false);
    setBookModal(false);
    loadBooks();
  }

  async function handleDeleteBook(id: number) {
    if (!confirm('Delete this book?')) return;
    const res = await fetch(`/api/library/books/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || 'Could not delete book.');
      return;
    }
    loadBooks();
  }

  function openIssueModal(book?: any) {
    setIssueError('');
    setIssueForm({ book_id: book ? String(book.id) : '', student_id: '', student_label: '', due_date: defaultDueDate() });
    setStudentQuery('');
    setStudentResults([]);
    setIssueModal(true);
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!issueForm.book_id || !issueForm.student_id) {
      setIssueError('Select a book and a student.');
      return;
    }
    setSavingIssue(true);
    setIssueError('');
    const res = await fetch('/api/library/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: issueForm.book_id, student_id: issueForm.student_id, due_date: issueForm.due_date }),
    });
    const d = await res.json();
    setSavingIssue(false);
    if (!res.ok) { setIssueError(d.error || 'Could not issue book.'); return; }
    setIssueModal(false);
    loadBooks();
    loadIssues();
  }

  async function handleReturn(issueId: number) {
    const res = await fetch(`/api/library/issues/${issueId}/return`, { method: 'POST' });
    const d = await res.json();
    if (!res.ok) { alert(d.error || 'Could not mark returned.'); return; }
    if (d.fine > 0) alert(`Book returned. Overdue by ${d.overdueDays} day(s) — fine: Rs. ${d.fine}`);
    loadBooks();
    loadIssues();
  }

  const activeIssues = issues.filter((i) => i.status === 'Issued');
  const returnedIssues = issues.filter((i) => i.status === 'Returned');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium text-text">Library</h1>
          <p className="text-xs text-textSecondary mt-0.5">Book catalog and issue/return tracking</p>
        </div>
        <div className="flex gap-2">
          {tab === 'books' ? (
            <button onClick={openNewBook} className="btn btn-primary">+ New book</button>
          ) : (
            <button onClick={() => openIssueModal()} className="btn btn-primary">+ Issue book</button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-border">
        <button
          onClick={() => setTab('books')}
          className={`px-3 py-2 text-sm font-medium ${tab === 'books' ? 'text-tertiary border-b-2 border-tertiary' : 'text-textSecondary'}`}
        >
          Books ({books.length})
        </button>
        <button
          onClick={() => setTab('issued')}
          className={`px-3 py-2 text-sm font-medium ${tab === 'issued' ? 'text-tertiary border-b-2 border-tertiary' : 'text-textSecondary'}`}
        >
          Issued ({activeIssues.length})
        </button>
      </div>

      {tab === 'books' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-container-low/60 text-left">
                {['Title', 'Author', 'Category', 'ISBN', 'Available', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {books.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-textSecondary text-sm">No books added yet.</td></tr>
              ) : (
                books.map((b) => (
                  <tr key={b.id} className="border-b border-borderLight last:border-0">
                    <td className="px-4 py-2.5 font-medium">{b.title}</td>
                    <td className="px-4 py-2.5">{b.author || '-'}</td>
                    <td className="px-4 py-2.5">{b.category || '-'}</td>
                    <td className="px-4 py-2.5">{b.isbn || '-'}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={b.available_copies > 0 ? 'green' : 'red'}>{b.available_copies} / {b.total_copies}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {b.available_copies > 0 && (
                        <button onClick={() => openIssueModal(b)} className="text-tertiary text-xs font-medium hover:underline mr-3">Issue</button>
                      )}
                      <button onClick={() => openEditBook(b)} className="text-tertiary text-xs font-medium hover:underline mr-3">Edit</button>
                      <button onClick={() => handleDeleteBook(b.id)} className="text-danger text-xs font-medium hover:underline">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'issued' && (
        <div className="space-y-5">
          <div className="card p-0 overflow-x-auto">
            <div className="px-4 py-3 border-b border-border text-[13px] font-semibold text-text">Currently issued</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-container-low/60 text-left">
                  {['Book', 'Student', 'Issued', 'Due', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeIssues.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-textSecondary text-sm">No books currently issued.</td></tr>
                ) : (
                  activeIssues.map((i) => (
                    <tr key={i.id} className="border-b border-borderLight last:border-0">
                      <td className="px-4 py-2.5 font-medium">{i.book_title}</td>
                      <td className="px-4 py-2.5">{i.student_name} <span className="text-textSecondary text-xs">{i.roll_number ? `(${i.roll_number})` : ''}</span></td>
                      <td className="px-4 py-2.5 text-textSecondary">{i.issued_date}</td>
                      <td className="px-4 py-2.5 text-textSecondary">{i.due_date}</td>
                      <td className="px-4 py-2.5">
                        {i.is_overdue ? <Badge tone="red">Overdue</Badge> : <Badge tone="blue">Issued</Badge>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => handleReturn(i.id)} className="text-tertiary text-xs font-medium hover:underline">Mark returned</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {returnedIssues.length > 0 && (
            <div className="card p-0 overflow-x-auto">
              <div className="px-4 py-3 border-b border-border text-[13px] font-semibold text-text">Return history</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-container-low/60 text-left">
                    {['Book', 'Student', 'Returned', 'Fine', ''].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {returnedIssues.slice(0, 20).map((i) => (
                    <tr key={i.id} className="border-b border-borderLight last:border-0">
                      <td className="px-4 py-2.5">{i.book_title}</td>
                      <td className="px-4 py-2.5">{i.student_name}</td>
                      <td className="px-4 py-2.5 text-textSecondary">{i.returned_date}</td>
                      <td className="px-4 py-2.5">{i.fine_amount > 0 ? <span className="text-danger">Rs. {i.fine_amount}</span> : '-'}</td>
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal open={bookModal} onClose={() => setBookModal(false)} title={editingBook ? 'Edit book' : 'New book'}>
        <form onSubmit={handleSaveBook} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" required value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Author</label>
              <input className="input" value={bookForm.author} onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" value={bookForm.category} onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ISBN</label>
              <input className="input" value={bookForm.isbn} onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })} />
            </div>
            <div>
              <label className="label">Total copies *</label>
              <input type="number" min={1} className="input" required value={bookForm.total_copies} onChange={(e) => setBookForm({ ...bookForm, total_copies: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setBookModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={savingBook} className="btn btn-primary">{savingBook ? 'Saving...' : editingBook ? 'Save changes' : 'Add book'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={issueModal} onClose={() => setIssueModal(false)} title="Issue book">
        <form onSubmit={handleIssue} className="space-y-4">
          {issueError && <div className="text-sm text-danger">{issueError}</div>}
          <div>
            <label className="label">Book *</label>
            <select className="input" required value={issueForm.book_id} onChange={(e) => setIssueForm({ ...issueForm, book_id: e.target.value })}>
              <option value="">Select a book</option>
              {books.filter((b) => b.available_copies > 0).map((b) => (
                <option key={b.id} value={b.id}>{b.title} ({b.available_copies} available)</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label className="label">Student *</label>
            {issueForm.student_id ? (
              <div className="input flex items-center justify-between">
                <span>{issueForm.student_label}</span>
                <button type="button" onClick={() => setIssueForm({ ...issueForm, student_id: '', student_label: '' })} className="text-xs text-tertiary">Change</button>
              </div>
            ) : (
              <>
                <input
                  className="input"
                  placeholder="Search student by name, roll no..."
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                />
                {studentResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {studentResults.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => {
                          setIssueForm({ ...issueForm, student_id: String(s.id), student_label: `${s.name}${s.roll_number ? ' (' + s.roll_number + ')' : ''}` });
                          setStudentResults([]);
                        }}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-surface-container-low/60"
                      >
                        {s.name} <span className="text-textSecondary text-xs">{s.batch_name || '-'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <label className="label">Due date *</label>
            <input type="date" className="input" required value={issueForm.due_date} onChange={(e) => setIssueForm({ ...issueForm, due_date: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIssueModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={savingIssue} className="btn btn-primary">{savingIssue ? 'Issuing...' : 'Issue book'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
