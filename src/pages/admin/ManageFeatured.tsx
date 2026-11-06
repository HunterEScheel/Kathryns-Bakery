import { useState } from 'react';
import { deleteFeatured, listFeatured, listProducts, saveFeatured } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { addDays, isoDate, prettyDate } from '../../lib/format';
import type { FeaturedItem } from '../../lib/types';
import Loading from '../../components/Loading';
import ErrorNote from '../../components/ErrorNote';

/** Monday of the current week. */
function weekStart(d = new Date()) {
  const r = new Date(d);
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

export default function ManageFeatured() {
  const featured = useAsync(() => listFeatured(false));
  const products = useAsync(listProducts);
  const [editing, setEditing] = useState<Partial<FeaturedItem> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const today = isoDate(new Date());

  const fresh = (): Partial<FeaturedItem> => ({
    product_id: products.data?.[0]?.id ?? '',
    starts_on: isoDate(weekStart()),
    ends_on: isoDate(addDays(weekStart(), 6)),
    position: featured.data?.length ?? 0,
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setErr(null);
    try {
      await saveFeatured(editing);
      setEditing(null);
      await featured.reload();
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  const status = (f: FeaturedItem) => (f.ends_on < today ? 'past' : f.starts_on > today ? 'upcoming' : 'live');

  return (
    <>
      <div className="row between wrap">
        <h1>Featured this week</h1>
        <button className="btn" disabled={!products.data?.length} onClick={() => setEditing(fresh())}>
          + Feature a product
        </button>
      </div>
      {(featured.loading || products.loading) && <Loading />}
      <ErrorNote error={featured.error || err} />
      <table className="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Dates</th>
            <th>Status</th>
            <th>Order</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {featured.data?.map((f) => (
            <tr key={f.id} className={status(f) === 'past' ? 'faded' : ''}>
              <td>
                <strong>{f.product?.name}</strong>
                {f.blurb && <div className="muted small">{f.blurb}</div>}
              </td>
              <td>
                {prettyDate(f.starts_on)} – {prettyDate(f.ends_on)}
              </td>
              <td>
                <span className={`badge ${status(f)}`}>{status(f)}</span>
              </td>
              <td>{f.position}</td>
              <td className="actions">
                <button className="btn small ghost" onClick={() => setEditing(f)}>
                  Edit
                </button>
                <button
                  className="btn small ghost"
                  onClick={async () => {
                    if (!confirm('Remove this feature?')) return;
                    await deleteFeatured(f.id).catch((x) => setErr(x.message));
                    await featured.reload();
                  }}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <dialog open className="modal">
          <form className="form card grid-form" onSubmit={save}>
            <h2 className="span-2">Feature a product</h2>
            <label className="span-2">
              Product
              <select required value={editing.product_id} onChange={(e) => setEditing({ ...editing, product_id: e.target.value })}>
                {products.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Starts
              <input type="date" required value={editing.starts_on} onChange={(e) => setEditing({ ...editing, starts_on: e.target.value })} />
            </label>
            <label>
              Ends
              <input
                type="date"
                required
                min={editing.starts_on}
                value={editing.ends_on}
                onChange={(e) => setEditing({ ...editing, ends_on: e.target.value })}
              />
            </label>
            <label className="span-2">
              Blurb (optional — defaults to product description)
              <textarea rows={3} value={editing.blurb ?? ''} onChange={(e) => setEditing({ ...editing, blurb: e.target.value || null })} />
            </label>
            <label>
              Sort order
              <input type="number" value={editing.position ?? 0} onChange={(e) => setEditing({ ...editing, position: Number(e.target.value) })} />
            </label>
            <div className="row end span-2">
              <button type="button" className="btn ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn">Save</button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
