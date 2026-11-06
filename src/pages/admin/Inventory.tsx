import { useMemo, useState } from 'react';
import {
  addInventoryTx,
  deleteInventoryItem,
  listIngredients,
  listInventory,
  listInventoryTx,
  saveInventoryItem,
} from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { isoDate, prettyDate } from '../../lib/format';
import { inventoryLabel } from '../../lib/zpl';
import { usePrinter } from '../../lib/printer';
import type { InventoryCategory, InventoryItem, TxReason } from '../../lib/types';
import Loading from '../../components/Loading';
import ErrorNote from '../../components/ErrorNote';

const CATEGORIES: { value: InventoryCategory; label: string }[] = [
  { value: 'ingredient', label: 'Ingredient' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'finished_good', label: 'Finished good' },
  { value: 'supply', label: 'Supply' },
];

const blank = (): Partial<InventoryItem> => ({
  name: '',
  category: 'ingredient',
  unit: 'g',
  quantity: 0,
  reorder_level: 0,
});

export default function Inventory() {
  const inv = useAsync(listInventory);
  const ingredients = useAsync(listIngredients);
  const { settings, print } = usePrinter();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'all' | 'low' | InventoryCategory>('all');
  const [editing, setEditing] = useState<Partial<InventoryItem> | null>(null);
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const today = isoDate(new Date());
  const isLow = (i: InventoryItem) => i.reorder_level > 0 && i.quantity <= i.reorder_level;
  const isExpiring = (i: InventoryItem) => !!i.expires_on && i.expires_on <= isoDate(new Date(Date.now() + 3 * 864e5));

  const rows = useMemo(
    () =>
      (inv.data ?? []).filter(
        (i) =>
          (cat === 'all' || (cat === 'low' ? isLow(i) : i.category === cat)) &&
          (i.name + ' ' + (i.sku ?? '') + ' ' + (i.location ?? '')).toLowerCase().includes(q.toLowerCase()),
      ),
    [inv.data, q, cat],
  );
  const lowCount = (inv.data ?? []).filter(isLow).length;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setErr(null);
    try {
      await saveInventoryItem(editing);
      setEditing(null);
      await inv.reload();
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  function printLabel(i: InventoryItem) {
    const copies = Number(prompt(`How many labels for "${i.name}"?`, '1'));
    if (!copies) return;
    void print(
      inventoryLabel(settings, {
        name: i.name,
        sku: i.sku,
        location: i.location,
        receivedOn: prettyDate(today),
        expiresOn: prettyDate(i.expires_on),
        copies,
      }),
      `${i.sku || i.name}.zpl`,
    );
  }

  return (
    <>
      <div className="row between wrap">
        <h1>Inventory</h1>
        <button className="btn" onClick={() => setEditing(blank())}>
          + Add item
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <span>{inv.data?.length ?? '–'}</span>items
        </div>
        <button className={`stat ${lowCount ? 'warn' : ''}`} onClick={() => setCat('low')}>
          <span>{lowCount}</span>at/below reorder
        </button>
        <div className="stat">
          <span>{(inv.data ?? []).filter(isExpiring).length}</span>expiring ≤ 3 days
        </div>
      </div>

      <div className="row wrap filters">
        <input className="search" placeholder="Search name, SKU, location…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={cat} onChange={(e) => setCat(e.target.value as typeof cat)}>
          <option value="all">All categories</option>
          <option value="low">Low stock</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <ErrorNote error={inv.error || err} />
      {inv.loading && <Loading />}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th className="num">On hand</th>
              <th className="num">Reorder at</th>
              <th>Location</th>
              <th>Expires</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className={isLow(i) ? 'low' : ''}>
                <td>
                  <strong>{i.name}</strong>
                  {i.sku && <div className="muted small">{i.sku}</div>}
                </td>
                <td>{CATEGORIES.find((c) => c.value === i.category)?.label}</td>
                <td className="num">
                  {i.quantity} {i.unit}
                </td>
                <td className="num">{i.reorder_level || ''}</td>
                <td>{i.location}</td>
                <td className={isExpiring(i) ? 'error-text' : ''}>{prettyDate(i.expires_on)}</td>
                <td className="actions">
                  <button className="btn small" onClick={() => setAdjusting(i)}>
                    ± Qty
                  </button>
                  <button className="btn small ghost" onClick={() => printLabel(i)}>
                    Label
                  </button>
                  <button className="btn small ghost" onClick={() => setEditing(i)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {inv.data && rows.length === 0 && <p className="muted">No items.</p>}

      {editing && (
        <dialog open className="modal">
          <form className="form card grid-form" onSubmit={save}>
            <h2 className="span-2">{editing.id ? 'Edit item' : 'New inventory item'}</h2>
            <label className="span-2">
              Name
              <input required value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label>
              Category
              <select
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value as InventoryCategory })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              SKU / barcode
              <input value={editing.sku ?? ''} onChange={(e) => setEditing({ ...editing, sku: e.target.value || null })} />
            </label>
            {editing.category === 'ingredient' && (
              <label className="span-2">
                Linked ingredient
                <select
                  value={editing.ingredient_id ?? ''}
                  onChange={(e) => {
                    const ing = ingredients.data?.find((x) => x.id === e.target.value);
                    setEditing({
                      ...editing,
                      ingredient_id: e.target.value || null,
                      name: editing.name || ing?.name || '',
                      unit: ing?.default_unit ?? editing.unit,
                    });
                  }}
                >
                  <option value="">—</option>
                  {ingredients.data?.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!editing.id && (
              <label>
                Starting quantity
                <input
                  type="number"
                  step="any"
                  value={editing.quantity ?? 0}
                  onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) })}
                />
              </label>
            )}
            <label>
              Unit
              <input value={editing.unit ?? ''} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} />
            </label>
            <label>
              Reorder level
              <input
                type="number"
                step="any"
                value={editing.reorder_level ?? 0}
                onChange={(e) => setEditing({ ...editing, reorder_level: Number(e.target.value) })}
              />
            </label>
            <label>
              Location
              <input value={editing.location ?? ''} onChange={(e) => setEditing({ ...editing, location: e.target.value || null })} />
            </label>
            <label>
              Supplier
              <input value={editing.supplier ?? ''} onChange={(e) => setEditing({ ...editing, supplier: e.target.value || null })} />
            </label>
            <label>
              Expires on
              <input
                type="date"
                value={editing.expires_on ?? ''}
                onChange={(e) => setEditing({ ...editing, expires_on: e.target.value || null })}
              />
            </label>
            <label className="span-2">
              Notes
              <textarea rows={2} value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value || null })} />
            </label>
            <div className="row between span-2">
              {editing.id ? (
                <button
                  type="button"
                  className="btn danger"
                  onClick={async () => {
                    if (!confirm(`Delete ${editing.name}?`)) return;
                    try {
                      await deleteInventoryItem(editing.id!);
                      setEditing(null);
                      await inv.reload();
                    } catch (x) {
                      setErr((x as Error).message);
                    }
                  }}
                >
                  Delete
                </button>
              ) : (
                <span />
              )}
              <div className="row">
                <button type="button" className="btn ghost" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button className="btn">Save</button>
              </div>
            </div>
          </form>
        </dialog>
      )}

      {adjusting && (
        <AdjustDialog
          item={adjusting}
          onClose={() => setAdjusting(null)}
          onDone={async () => {
            setAdjusting(null);
            await inv.reload();
          }}
        />
      )}
    </>
  );
}

const REASONS: { value: TxReason; label: string; sign: 1 | -1 | 0 }[] = [
  { value: 'receive', label: 'Received', sign: 1 },
  { value: 'use', label: 'Used in production', sign: -1 },
  { value: 'sale', label: 'Sold', sign: -1 },
  { value: 'waste', label: 'Waste / spoilage', sign: -1 },
  { value: 'count', label: 'Physical count (set to)', sign: 0 },
  { value: 'adjust', label: 'Other adjustment (+/-)', sign: 0 },
];

function AdjustDialog({ item, onClose, onDone }: { item: InventoryItem; onClose: () => void; onDone: () => void }) {
  const history = useAsync(() => listInventoryTx(item.id), [item.id]);
  const [reason, setReason] = useState<TxReason>('receive');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const r = REASONS.find((x) => x.value === reason)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n)) return;
    const change = reason === 'count' ? n - item.quantity : r.sign === 0 ? n : r.sign * Math.abs(n);
    if (change === 0) return onClose();
    try {
      await addInventoryTx(item.id, change, reason, note);
      onDone();
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  return (
    <dialog open className="modal">
      <form className="form card" onSubmit={submit}>
        <h2>
          {item.name} <small className="muted">— {item.quantity} {item.unit} on hand</small>
        </h2>
        <label>
          Reason
          <select value={reason} onChange={(e) => setReason(e.target.value as TxReason)}>
            {REASONS.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {reason === 'count' ? 'Counted quantity' : 'Amount'} ({item.unit})
          <input type="number" step="any" required autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label>
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <ErrorNote error={err} />
        <div className="row end">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn">Save</button>
        </div>
        <h3>Recent activity</h3>
        {history.loading ? (
          <Loading />
        ) : (
          <ul className="history">
            {history.data?.map((t) => (
              <li key={t.id}>
                <span className={t.change < 0 ? 'error-text' : 'ok-text'}>
                  {t.change > 0 ? '+' : ''}
                  {t.change}
                </span>{' '}
                {t.reason} <span className="muted small">{new Date(t.created_at).toLocaleString()}</span>
                {t.note && <span className="muted"> — {t.note}</span>}
              </li>
            ))}
            {history.data?.length === 0 && <li className="muted">No activity yet.</li>}
          </ul>
        )}
      </form>
    </dialog>
  );
}
