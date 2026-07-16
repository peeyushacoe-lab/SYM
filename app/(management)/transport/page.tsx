'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';

const emptyVehicle = { vehicle_number: '', driver_name: '', driver_mobile: '', capacity: 1, route_name: '', remarks: '' };
const emptyAssign = { vehicle_id: '', student_id: '', student_label: '', pickup_point: '', monthly_fee: '', assigned_date: new Date().toISOString().slice(0, 10) };

export default function TransportPage() {
  const [tab, setTab] = useState<'vehicles' | 'assignments'>('vehicles');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  const [vehicleModal, setVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [savingVehicle, setSavingVehicle] = useState(false);

  const [assignModal, setAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState(emptyAssign);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const [assignError, setAssignError] = useState('');

  function loadVehicles() {
    fetch('/api/transport/vehicles').then((r) => r.json()).then((d) => setVehicles(d.items || []));
  }
  function loadAssignments() {
    fetch('/api/transport/assignments').then((r) => r.json()).then((d) => setAssignments(d.items || []));
  }

  useEffect(() => { loadVehicles(); loadAssignments(); }, []);

  useEffect(() => {
    if (!studentQuery.trim()) { setStudentResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/students?search=${encodeURIComponent(studentQuery)}`)
        .then((r) => r.json())
        .then((d) => setStudentResults((d.items || []).slice(0, 8)));
    }, 250);
    return () => clearTimeout(t);
  }, [studentQuery]);

  function openNewVehicle() {
    setEditingVehicle(null);
    setVehicleForm(emptyVehicle);
    setVehicleModal(true);
  }
  function openEditVehicle(v: any) {
    setEditingVehicle(v);
    setVehicleForm({ vehicle_number: v.vehicle_number, driver_name: v.driver_name || '', driver_mobile: v.driver_mobile || '', capacity: v.capacity, route_name: v.route_name || '', remarks: v.remarks || '' });
    setVehicleModal(true);
  }

  async function handleSaveVehicle(e: React.FormEvent) {
    e.preventDefault();
    setSavingVehicle(true);
    if (editingVehicle) {
      await fetch(`/api/transport/vehicles/${editingVehicle.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vehicleForm) });
    } else {
      await fetch('/api/transport/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vehicleForm) });
    }
    setSavingVehicle(false);
    setVehicleModal(false);
    loadVehicles();
  }

  async function handleDeleteVehicle(id: number) {
    if (!confirm('Delete this vehicle?')) return;
    const res = await fetch(`/api/transport/vehicles/${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Could not delete vehicle.'); return; }
    loadVehicles();
  }

  function openAssignModal(vehicle?: any) {
    setAssignError('');
    setAssignForm({ ...emptyAssign, vehicle_id: vehicle ? String(vehicle.id) : '' });
    setStudentQuery('');
    setStudentResults([]);
    setAssignModal(true);
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignForm.vehicle_id || !assignForm.student_id) { setAssignError('Select a vehicle and a student.'); return; }
    setSavingAssign(true);
    setAssignError('');
    const res = await fetch('/api/transport/assignments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assignForm),
    });
    const d = await res.json();
    setSavingAssign(false);
    if (!res.ok) { setAssignError(d.error || 'Could not assign transport.'); return; }
    setAssignModal(false);
    loadVehicles();
    loadAssignments();
  }

  async function handleRemoveAssignment(id: number) {
    if (!confirm('Remove this student from transport?')) return;
    await fetch(`/api/transport/assignments/${id}`, { method: 'DELETE' });
    loadVehicles();
    loadAssignments();
  }

  const activeAssignments = assignments.filter((a) => a.status === 'Active');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium text-text">Transport</h1>
          <p className="text-xs text-textSecondary mt-0.5">Vehicles, routes and student transport assignments</p>
        </div>
        <div className="flex gap-2">
          {tab === 'vehicles' ? (
            <button onClick={openNewVehicle} className="btn btn-primary">+ New vehicle</button>
          ) : (
            <button onClick={() => openAssignModal()} className="btn btn-primary">+ Assign student</button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-border">
        <button onClick={() => setTab('vehicles')} className={`px-3 py-2 text-sm font-medium ${tab === 'vehicles' ? 'text-tertiary border-b-2 border-tertiary' : 'text-textSecondary'}`}>
          Vehicles ({vehicles.length})
        </button>
        <button onClick={() => setTab('assignments')} className={`px-3 py-2 text-sm font-medium ${tab === 'assignments' ? 'text-tertiary border-b-2 border-tertiary' : 'text-textSecondary'}`}>
          Assignments ({activeAssignments.length})
        </button>
      </div>

      {tab === 'vehicles' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-container-low/60 text-left">
                {['Vehicle', 'Route', 'Driver', 'Occupancy', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-textSecondary text-sm">No vehicles added yet.</td></tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="border-b border-borderLight last:border-0">
                    <td className="px-4 py-2.5 font-medium">{v.vehicle_number}</td>
                    <td className="px-4 py-2.5">{v.route_name || '-'}</td>
                    <td className="px-4 py-2.5">{v.driver_name || '-'} {v.driver_mobile ? `(${v.driver_mobile})` : ''}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={v.assigned_count >= v.capacity ? 'red' : 'green'}>{v.assigned_count} / {v.capacity}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {v.assigned_count < v.capacity && (
                        <button onClick={() => openAssignModal(v)} className="text-tertiary text-xs font-medium hover:underline mr-3">Assign</button>
                      )}
                      <button onClick={() => openEditVehicle(v)} className="text-tertiary text-xs font-medium hover:underline mr-3">Edit</button>
                      <button onClick={() => handleDeleteVehicle(v.id)} className="text-danger text-xs font-medium hover:underline">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'assignments' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-container-low/60 text-left">
                {['Vehicle', 'Student', 'Pickup point', 'Monthly fee', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeAssignments.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-textSecondary text-sm">No active assignments.</td></tr>
              ) : (
                activeAssignments.map((a) => (
                  <tr key={a.id} className="border-b border-borderLight last:border-0">
                    <td className="px-4 py-2.5 font-medium">{a.vehicle_number} {a.route_name ? `(${a.route_name})` : ''}</td>
                    <td className="px-4 py-2.5">{a.student_name} <span className="text-textSecondary text-xs">{a.roll_number ? `(${a.roll_number})` : ''}</span></td>
                    <td className="px-4 py-2.5">{a.pickup_point || '-'}</td>
                    <td className="px-4 py-2.5">{a.monthly_fee > 0 ? `Rs. ${a.monthly_fee}` : '-'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => handleRemoveAssignment(a.id)} className="text-danger text-xs font-medium hover:underline">Remove</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={vehicleModal} onClose={() => setVehicleModal(false)} title={editingVehicle ? 'Edit vehicle' : 'New vehicle'}>
        <form onSubmit={handleSaveVehicle} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Vehicle number *</label>
              <input className="input" required value={vehicleForm.vehicle_number} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value })} />
            </div>
            <div>
              <label className="label">Capacity *</label>
              <input type="number" min={1} className="input" required value={vehicleForm.capacity} onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label">Route name</label>
            <input className="input" placeholder="e.g. Route 1 - City Center" value={vehicleForm.route_name} onChange={(e) => setVehicleForm({ ...vehicleForm, route_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Driver name</label>
              <input className="input" value={vehicleForm.driver_name} onChange={(e) => setVehicleForm({ ...vehicleForm, driver_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Driver mobile</label>
              <input className="input" value={vehicleForm.driver_mobile} onChange={(e) => setVehicleForm({ ...vehicleForm, driver_mobile: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea className="input" rows={2} value={vehicleForm.remarks} onChange={(e) => setVehicleForm({ ...vehicleForm, remarks: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setVehicleModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={savingVehicle} className="btn btn-primary">{savingVehicle ? 'Saving...' : editingVehicle ? 'Save changes' : 'Add vehicle'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign transport">
        <form onSubmit={handleAssign} className="space-y-4">
          {assignError && <div className="text-sm text-danger">{assignError}</div>}
          <div>
            <label className="label">Vehicle *</label>
            <select className="input" required value={assignForm.vehicle_id} onChange={(e) => setAssignForm({ ...assignForm, vehicle_id: e.target.value })}>
              <option value="">Select a vehicle</option>
              {vehicles.filter((v) => v.assigned_count < v.capacity).map((v) => (
                <option key={v.id} value={v.id}>{v.vehicle_number} {v.route_name ? `(${v.route_name})` : ''} — {v.capacity - v.assigned_count} free</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label className="label">Student *</label>
            {assignForm.student_id ? (
              <div className="input flex items-center justify-between">
                <span>{assignForm.student_label}</span>
                <button type="button" onClick={() => setAssignForm({ ...assignForm, student_id: '', student_label: '' })} className="text-xs text-tertiary">Change</button>
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
                          setAssignForm({ ...assignForm, student_id: String(s.id), student_label: `${s.name}${s.roll_number ? ' (' + s.roll_number + ')' : ''}` });
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
            <label className="label">Pickup point</label>
            <input className="input" value={assignForm.pickup_point} onChange={(e) => setAssignForm({ ...assignForm, pickup_point: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monthly fee (Rs.)</label>
              <input type="number" min={0} className="input" value={assignForm.monthly_fee} onChange={(e) => setAssignForm({ ...assignForm, monthly_fee: e.target.value })} />
            </div>
            <div>
              <label className="label">Assigned date</label>
              <input type="date" className="input" value={assignForm.assigned_date} onChange={(e) => setAssignForm({ ...assignForm, assigned_date: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAssignModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={savingAssign} className="btn btn-primary">{savingAssign ? 'Assigning...' : 'Assign'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
