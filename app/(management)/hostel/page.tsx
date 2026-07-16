'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';

const emptyRoom = { room_number: '', block: '', room_type: 'Shared', capacity: 1, monthly_fee: '', remarks: '' };
const emptyAlloc = { room_id: '', student_id: '', student_label: '', allocated_date: new Date().toISOString().slice(0, 10), remarks: '' };

export default function HostelPage() {
  const [tab, setTab] = useState<'rooms' | 'allocations'>('rooms');
  const [rooms, setRooms] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);

  const [roomModal, setRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [roomForm, setRoomForm] = useState(emptyRoom);
  const [savingRoom, setSavingRoom] = useState(false);

  const [allocModal, setAllocModal] = useState(false);
  const [allocForm, setAllocForm] = useState(emptyAlloc);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [savingAlloc, setSavingAlloc] = useState(false);
  const [allocError, setAllocError] = useState('');

  function loadRooms() {
    fetch('/api/hostel/rooms').then((r) => r.json()).then((d) => setRooms(d.items || []));
  }
  function loadAllocations() {
    fetch('/api/hostel/allocations').then((r) => r.json()).then((d) => setAllocations(d.items || []));
  }

  useEffect(() => { loadRooms(); loadAllocations(); }, []);

  useEffect(() => {
    if (!studentQuery.trim()) { setStudentResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/students?search=${encodeURIComponent(studentQuery)}`)
        .then((r) => r.json())
        .then((d) => setStudentResults((d.items || []).slice(0, 8)));
    }, 250);
    return () => clearTimeout(t);
  }, [studentQuery]);

  function openNewRoom() {
    setEditingRoom(null);
    setRoomForm(emptyRoom);
    setRoomModal(true);
  }
  function openEditRoom(r: any) {
    setEditingRoom(r);
    setRoomForm({ room_number: r.room_number, block: r.block || '', room_type: r.room_type, capacity: r.capacity, monthly_fee: String(r.monthly_fee || ''), remarks: r.remarks || '' });
    setRoomModal(true);
  }

  async function handleSaveRoom(e: React.FormEvent) {
    e.preventDefault();
    setSavingRoom(true);
    if (editingRoom) {
      await fetch(`/api/hostel/rooms/${editingRoom.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(roomForm) });
    } else {
      await fetch('/api/hostel/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(roomForm) });
    }
    setSavingRoom(false);
    setRoomModal(false);
    loadRooms();
  }

  async function handleDeleteRoom(id: number) {
    if (!confirm('Delete this room?')) return;
    const res = await fetch(`/api/hostel/rooms/${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Could not delete room.'); return; }
    loadRooms();
  }

  function openAllocModal(room?: any) {
    setAllocError('');
    setAllocForm({ ...emptyAlloc, room_id: room ? String(room.id) : '' });
    setStudentQuery('');
    setStudentResults([]);
    setAllocModal(true);
  }

  async function handleAllocate(e: React.FormEvent) {
    e.preventDefault();
    if (!allocForm.room_id || !allocForm.student_id) { setAllocError('Select a room and a student.'); return; }
    setSavingAlloc(true);
    setAllocError('');
    const res = await fetch('/api/hostel/allocations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: allocForm.room_id, student_id: allocForm.student_id, allocated_date: allocForm.allocated_date, remarks: allocForm.remarks }),
    });
    const d = await res.json();
    setSavingAlloc(false);
    if (!res.ok) { setAllocError(d.error || 'Could not allocate room.'); return; }
    setAllocModal(false);
    loadRooms();
    loadAllocations();
  }

  async function handleVacate(id: number) {
    if (!confirm('Mark this allocation as vacated?')) return;
    const res = await fetch(`/api/hostel/allocations/${id}/vacate`, { method: 'POST' });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Could not vacate.'); return; }
    loadRooms();
    loadAllocations();
  }

  const activeAllocations = allocations.filter((a) => a.status === 'Active');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium text-text">Hostel</h1>
          <p className="text-xs text-textSecondary mt-0.5">Rooms and student room allocations</p>
        </div>
        <div className="flex gap-2">
          {tab === 'rooms' ? (
            <button onClick={openNewRoom} className="btn btn-primary">+ New room</button>
          ) : (
            <button onClick={() => openAllocModal()} className="btn btn-primary">+ Allocate room</button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-border">
        <button onClick={() => setTab('rooms')} className={`px-3 py-2 text-sm font-medium ${tab === 'rooms' ? 'text-tertiary border-b-2 border-tertiary' : 'text-textSecondary'}`}>
          Rooms ({rooms.length})
        </button>
        <button onClick={() => setTab('allocations')} className={`px-3 py-2 text-sm font-medium ${tab === 'allocations' ? 'text-tertiary border-b-2 border-tertiary' : 'text-textSecondary'}`}>
          Allocations ({activeAllocations.length})
        </button>
      </div>

      {tab === 'rooms' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-container-low/60 text-left">
                {['Room', 'Block', 'Type', 'Occupancy', 'Monthly fee', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-textSecondary text-sm">No rooms added yet.</td></tr>
              ) : (
                rooms.map((r) => (
                  <tr key={r.id} className="border-b border-borderLight last:border-0">
                    <td className="px-4 py-2.5 font-medium">{r.room_number}</td>
                    <td className="px-4 py-2.5">{r.block || '-'}</td>
                    <td className="px-4 py-2.5">{r.room_type}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={r.occupied_count >= r.capacity ? 'red' : 'green'}>{r.occupied_count} / {r.capacity}</Badge>
                    </td>
                    <td className="px-4 py-2.5">{r.monthly_fee > 0 ? `Rs. ${r.monthly_fee}` : '-'}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {r.occupied_count < r.capacity && (
                        <button onClick={() => openAllocModal(r)} className="text-tertiary text-xs font-medium hover:underline mr-3">Allocate</button>
                      )}
                      <button onClick={() => openEditRoom(r)} className="text-tertiary text-xs font-medium hover:underline mr-3">Edit</button>
                      <button onClick={() => handleDeleteRoom(r.id)} className="text-danger text-xs font-medium hover:underline">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'allocations' && (
        <div className="space-y-5">
          <div className="card p-0 overflow-x-auto">
            <div className="px-4 py-3 border-b border-border text-[13px] font-semibold text-text">Active allocations</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-container-low/60 text-left">
                  {['Room', 'Student', 'Allocated', 'Monthly fee', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeAllocations.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-textSecondary text-sm">No active allocations.</td></tr>
                ) : (
                  activeAllocations.map((a) => (
                    <tr key={a.id} className="border-b border-borderLight last:border-0">
                      <td className="px-4 py-2.5 font-medium">{a.room_number} {a.block ? `(${a.block})` : ''}</td>
                      <td className="px-4 py-2.5">{a.student_name} <span className="text-textSecondary text-xs">{a.roll_number ? `(${a.roll_number})` : ''}</span></td>
                      <td className="px-4 py-2.5 text-textSecondary">{a.allocated_date}</td>
                      <td className="px-4 py-2.5">{a.monthly_fee > 0 ? `Rs. ${a.monthly_fee}` : '-'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => handleVacate(a.id)} className="text-danger text-xs font-medium hover:underline">Vacate</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={roomModal} onClose={() => setRoomModal(false)} title={editingRoom ? 'Edit room' : 'New room'}>
        <form onSubmit={handleSaveRoom} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Room number *</label>
              <input className="input" required value={roomForm.room_number} onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })} />
            </div>
            <div>
              <label className="label">Block</label>
              <input className="input" value={roomForm.block} onChange={(e) => setRoomForm({ ...roomForm, block: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Room type</label>
              <select className="input" value={roomForm.room_type} onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}>
                <option value="Single">Single</option>
                <option value="Shared">Shared</option>
                <option value="Dormitory">Dormitory</option>
              </select>
            </div>
            <div>
              <label className="label">Capacity *</label>
              <input type="number" min={1} className="input" required value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label">Monthly fee (Rs.)</label>
            <input type="number" min={0} className="input" value={roomForm.monthly_fee} onChange={(e) => setRoomForm({ ...roomForm, monthly_fee: e.target.value })} />
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea className="input" rows={2} value={roomForm.remarks} onChange={(e) => setRoomForm({ ...roomForm, remarks: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRoomModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={savingRoom} className="btn btn-primary">{savingRoom ? 'Saving...' : editingRoom ? 'Save changes' : 'Add room'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={allocModal} onClose={() => setAllocModal(false)} title="Allocate room">
        <form onSubmit={handleAllocate} className="space-y-4">
          {allocError && <div className="text-sm text-danger">{allocError}</div>}
          <div>
            <label className="label">Room *</label>
            <select className="input" required value={allocForm.room_id} onChange={(e) => setAllocForm({ ...allocForm, room_id: e.target.value })}>
              <option value="">Select a room</option>
              {rooms.filter((r) => r.occupied_count < r.capacity).map((r) => (
                <option key={r.id} value={r.id}>{r.room_number} {r.block ? `(${r.block})` : ''} — {r.capacity - r.occupied_count} free</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label className="label">Student *</label>
            {allocForm.student_id ? (
              <div className="input flex items-center justify-between">
                <span>{allocForm.student_label}</span>
                <button type="button" onClick={() => setAllocForm({ ...allocForm, student_id: '', student_label: '' })} className="text-xs text-tertiary">Change</button>
              </div>
            ) : (
              <>
                <input className="input" placeholder="Search student by name, roll no..." value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} />
                {studentResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {studentResults.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => {
                          setAllocForm({ ...allocForm, student_id: String(s.id), student_label: `${s.name}${s.roll_number ? ' (' + s.roll_number + ')' : ''}` });
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
            <label className="label">Allocated date</label>
            <input type="date" className="input" value={allocForm.allocated_date} onChange={(e) => setAllocForm({ ...allocForm, allocated_date: e.target.value })} />
          </div>
          <div>
            <label className="label">Remarks</label>
            <input className="input" value={allocForm.remarks} onChange={(e) => setAllocForm({ ...allocForm, remarks: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAllocModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={savingAlloc} className="btn btn-primary">{savingAlloc ? 'Allocating...' : 'Allocate room'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
