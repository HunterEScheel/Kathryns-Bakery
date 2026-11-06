import { useState } from 'react';
import { deleteProduct, listProducts, listRecipes, saveProduct } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { money } from '../../lib/format';
import type { Product } from '../../lib/types';
import Loading from '../../components/Loading';
import ErrorNote from '../../components/ErrorNote';
import ImageInput from '../../components/ImageInput';

export default function ManageProducts() {
  const products = useAsync(listProducts);
  const recipes = useAsync(listRecipes);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setErr(null);
    try {
      await saveProduct(editing);
      setEditing(null);
      await products.reload();
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  return (
    <>
      <div className="row between wrap">
        <h1>Products</h1>
        <button className="btn" onClick={() => setEditing({ name: '', is_active: true })}>
          + New product
        </button>
      </div>
      {products.loading && <Loading />}
      <ErrorNote error={products.error || err} />
      <table className="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th className="num">Price</th>
            <th>Recipe</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {products.data?.map((p) => (
            <tr key={p.id}>
              <td>
                <strong>{p.name}</strong>
              </td>
              <td>{p.sku}</td>
              <td className="num">{money(p.price)}</td>
              <td>{p.recipe?.name ?? <span className="error-text">none</span>}</td>
              <td>{p.is_active ? 'Yes' : 'No'}</td>
              <td>
                <button className="btn small ghost" onClick={() => setEditing(p)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <dialog open className="modal">
          <form className="form card grid-form" onSubmit={save}>
            <h2 className="span-2">{editing.id ? 'Edit product' : 'New product'}</h2>
            <label className="span-2">
              Name
              <input required value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label>
              SKU / barcode
              <input value={editing.sku ?? ''} onChange={(e) => setEditing({ ...editing, sku: e.target.value || null })} />
            </label>
            <label>
              Price ($)
              <input
                type="number"
                step="0.01"
                min="0"
                value={editing.price ?? ''}
                onChange={(e) => setEditing({ ...editing, price: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
            <label>
              Recipe (for ingredients &amp; allergens)
              <select value={editing.recipe_id ?? ''} onChange={(e) => setEditing({ ...editing, recipe_id: e.target.value || null })}>
                <option value="">—</option>
                {recipes.data?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Net weight
              <input
                placeholder="e.g. 12 oz (340 g)"
                value={editing.net_weight ?? ''}
                onChange={(e) => setEditing({ ...editing, net_weight: e.target.value || null })}
              />
            </label>
            <label>
              Shelf life (days)
              <input
                type="number"
                min="0"
                value={editing.shelf_life_days ?? ''}
                onChange={(e) => setEditing({ ...editing, shelf_life_days: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
            <label className="check">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />{' '}
              Show on Products page
            </label>
            <label className="span-2">
              Description
              <textarea rows={3} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value || null })} />
            </label>
            <div className="span-2">
              <span className="label-text">Photo</span>
              <ImageInput folder="products" value={editing.image_url ?? null} onChange={(url) => setEditing({ ...editing, image_url: url })} />
            </div>
            <div className="row between span-2">
              {editing.id ? (
                <button
                  type="button"
                  className="btn danger"
                  onClick={async () => {
                    if (!confirm(`Delete ${editing.name}?`)) return;
                    try {
                      await deleteProduct(editing.id!);
                      setEditing(null);
                      await products.reload();
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
    </>
  );
}
