'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';

const emptyItem = { name: '', category: '', quantity: 0, unit: 'pcs', unit_cost: '', reorder_level: '', location: '', remarks: '' };
const emptyTxn = { item_id: '', type: 'In', quantity: '', reason: '', txn_date: new Date().toISOString().slice(0, 10) };

export default function InventoryPage() {
  const [tab, setTab] = useState<'items' | 'log'>('items');
  const [items, setItems] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);

  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [savingItem, setSavingItem] = useState(false);

  const [txnModal, setTxnModal] = useState(false);
  const [txnForm, setTxnForm] = useState(emptyTxn);
  const [savingTxn, setSavingTxn] = useState(false);
  const [txnError, setTxnError] = useState('');

  function loadItems() {
    fetch('/api/inventory/items').then((r) => r.json()).then((d) => setItems(d.items || []));
  }
  function loadTxns() {
    fetch('/api/inventory/transactions').then((r) => r.json()).then((d) => setTxns(d.items || []));
  }

  useEffect(() => { loadItems(); loadTxns(); }, []);

  function openNewItem() {
    setEditingItem(null);
    setItemForm(emptyItem);
    setItemModal(true);
  }
  function openEditItem(it: any) {
    setEditingItem(it);
    setItemForm({
      name: it.name, category: it.category || '', quantity: it.quantity, unit: it.unit || 'pcs',
      unit_cost: String(it.unit_cost || ''), reorder_level: String(it.reorder_level || ''), location: it.location || '', remarks: it.remarks || '',
    });
    setItemModal(true);
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    setSavingItem(true);
    if (editingItem) {
      await fetch(`/api/inventory/items/${editingItem.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itemForm),
      });
    } else {
      await fetch('/api/inventory/items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itemForm),
      });
    }
    setSavingItem(false);
    setItemModal(false);
    loadItems();
    loadTxns();
  }

  async function handleDeleteItem(id: number) {
    if (!confirm('Delete this item and its transaction history?')) return;
    await fetch(`/api/inventory/items/${id}`, { method: 'DELETE' });
    loadItems();
    loadTxns();
  }

  function openTxnModal(item?: any) {
    setTxnError('');
    setTxnForm({ ...emptyTxn, item_id: item ? String(item.id) : '' });
    setTxnModal(true);
  }

  async function handleTxn(e: React.FormEvent) {
    e.preventDefault();
    if (!txnForm.item_id || !txnForm.quantity) { setTxnError('Select an item and enter a quantity.'); return; }
    setSavingTxn(true);
    setTxnError('');
    const res = await fetch('/api/inventory/transactions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(txnForm),
    });
    const d = await res.json();
    setSavingTxn(false);
    if (!res.ok) { setTxnError(d.error || 'Could not record transaction.'); return; }
    setTxnModal(false);
    loadItems();
    loadTxns();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium text-text">Inventory</h1>
          <p className="text-xs text-textSecondary mt-0.5">Assets, stock levels and stock movements</p>
        </div>
        <div className="flex gap-2">
          {tab === 'items' ? (
            <>
              <button onClick={() => openTxnModal()} className="btn btn-outline">Stock in/out</button>
              <button onClick={openNewItem} className="btn btn-primary">+ New item</button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-border">
        <button onClick={() => setTab('items')} className={`px-3 py-2 text-sm font-medium ${tab === 'items' ? 'text-tertiary border-b-2 border-tertiary' : 'text-textSecondary'}`}>
          Items ({items.length})
        </button>
        <button onClick={() => setTab('log')} className={`px-3 py-2 text-sm font-medium ${tab === 'log' ? 'text-tertiary border-b-2 border-tertiary' : 'text-textSecondary'}`}>
          Stock log
        </button>
      </div>

      {tab === 'items' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-container-low/60 text-left">
                {['Item', 'Category', 'Quantity', 'Unit cost', 'Location', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-textSecondary text-sm">No inventory items yet.</td></tr>
              ) : (
                items.map((it) => {
                  const low = it.reorder_level > 0 && it.quantity <= it.reorder_level;
                  return (
                    <tr key={it.id} className="border-b border-borderLight last:border-0">
                      <td className="px-4 py-2.5 font-medium">{it.name}</td>
                      <td className="px-4 py-2.5">{it.category || '-'}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={low ? 'red' : 'green'}>{it.quantity} {it.unit}</Badge>
                        {low && <span className="text-[10px] text-danger ml-1.5">Low stock</span>}
                      </td>
                      <td className="px-4 py-2.5">{it.unit_cost > 0 ? `Rs. ${it.unit_cost}` : '-'}</td>
                      <td className="px-4 py-2.5">{it.location || '-'}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => openTxnModal(it)} className="text-tertiary text-xs font-medium hover:underline mr-3">Stock in/out</button>
                        <button onClick={() => openEditItem(it)} className="text-tertiary text-xs font-medium hover:underline mr-3">Edit</button>
                        <button onClick={() => handleDeleteItem(it.id)} className="text-danger text-xs font-medium hover:underline">Delete</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'log' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-container-low/60 text-left">
                {['Date', 'Item', 'Type', 'Quantity', 'Reason'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-textSecondary uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-textSecondary text-sm">No stock movements yet.</td></tr>
              ) : (
                txns.map((t) => (
                  <tr key={t.id} className="border-b border-borderLight last:border-0">
                    <td className="px-4 py-2.5 text-textSecondary">{t.txn_date}</td>
                    <td className="px-4 py-2.5 font-medium">{t.item_name}</td>
                    <td className="px-4 py-2.5"><Badge tone={t.type === 'In' ? 'green' : 'red'}>{t.type}</Badge></td>
                    <td className="px-4 py-2.5">{t.quantity} {t.unit}</td>
                    <td className="px-4 py-2.5 text-textSecondary">{t.reason || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={itemModal} onClose={() => setItemModal(false)} title={editingItem ? 'Edit item' : 'New item'}>
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div>
            <label className="label">Item name *</label>
            <input className="input" required value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <input className="input" value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input" placeholder="pcs, kg, box..." value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} />
            </div>
          </div>
          {!editingItem && (
            <div>
              <label className="label">Opening quantity</label>
              <input type="number" min={0} className="input" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) })} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unit cost (Rs.)</label>
              <input type="number" min={0} className="input" value={itemForm.unit_cost} onChange={(e) => setItemForm({ ...itemForm, unit_cost: e.target.value })} />
            </div>
            <div>
              <label className="label">Reorder level</label>
              <input type="number" min={0} className="input" value={itemForm.reorder_level} onChange={(e) => setItemForm({ ...itemForm, reorder_level: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" placeholder="e.g. Store room, Lab 1" value={itemForm.location} onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} />
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea className="input" rows={2} value={itemForm.remarks} onChange={(e) => setItemForm({ ...itemForm, remarks: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setItemModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={savingItem} className="btn btn-primary">{savingItem ? 'Saving...' : editingItem ? 'Save changes' : 'Add item'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={txnModal} onClose={() => setTxnModal(false)} title="Stock in / out">
        <form onSubmit={handleTxn} className="space-y-4">
          {txnError && <div className="text-sm text-danger">{txnError}</div>}
          <div>
            <label className="label">Item *</label>
            <select className="input" required value={txnForm.item_id} onChange={(e) => setTxnForm({ ...txnForm, item_id: e.target.value })}>
              <option value="">Select an item</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>{it.name} ({it.quantity} {it.unit} in stock)</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type *</label>
              <select className="input" value={txnForm.type} onChange={(e) => setTxnForm({ ...txnForm, type: e.target.value })}>
                <option value="In">Stock in (purchase/return)</option>
                <option value="Out">Stock out (issue/damage)</option>
              </select>
            </div>
            <div>
              <label className="label">Quantity *</label>
              <input type="number" min={1} className="input" required value={txnForm.quantity} onChange={(e) => setTxnForm({ ...txnForm, quantity: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={txnForm.txn_date} onChange={(e) => setTxnForm({ ...txnForm, txn_date: e.target.value })} />
          </div>
          <div>
            <label className="label">Reason / notes</label>
            <input className="input" placeholder="e.g. Purchased for Lab 2" value={txnForm.reason} onChange={(e) => setTxnForm({ ...txnForm, reason: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setTxnModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={savingTxn} className="btn btn-primary">{savingTxn ? 'Saving...' : 'Record'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
