import { useMemo, useState } from 'react';
import { listProducts } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { addDays, isoDate, prettyDate } from '../../lib/format';
import { ingredientStatement, productLabel } from '../../lib/zpl';
import { usePrinter } from '../../lib/printer';
import { downloadZpl } from '../../lib/zebra';
import type { Product } from '../../lib/types';
import PrinterPanel from '../../components/PrinterPanel';
import LabelPreview from '../../components/LabelPreview';
import Loading from '../../components/Loading';
import ErrorNote from '../../components/ErrorNote';

interface QueueRow {
  productId: string;
  copies: number;
}

export default function Labels() {
  const { data: products, error, loading } = useAsync(listProducts);
  const { settings, print } = usePrinter();
  const [productId, setProductId] = useState('');
  const [bakedOn, setBakedOn] = useState(isoDate(new Date()));
  const [showPrice, setShowPrice] = useState(true);
  const [copies, setCopies] = useState(1);
  const [overrideIngredients, setOverrideIngredients] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);
  const product = byId.get(productId) ?? products?.[0];

  const buildZpl = (p: Product, n: number, ingOverride?: string | null) => {
    const st = ingredientStatement(p.recipe?.recipe_ingredients ?? []);
    const baked = new Date(bakedOn + 'T00:00:00');
    return productLabel(settings, {
      product: p,
      ingredients: ingOverride ?? st.ingredients,
      allergens: st.allergens,
      bakedOn: prettyDate(bakedOn),
      bestBy: p.shelf_life_days ? addDays(baked, p.shelf_life_days).toLocaleDateString() : undefined,
      showPrice,
      copies: n,
    });
  };

  const zpl = product ? buildZpl(product, copies, overrideIngredients) : '';
  const autoIngredients = product ? ingredientStatement(product.recipe?.recipe_ingredients ?? []).ingredients : '';

  async function printQueue() {
    setBusy(true);
    const job = queue
      .map((q) => byId.get(q.productId))
      .map((p, i) => (p ? buildZpl(p, queue[i].copies) : ''))
      .join('\n');
    if (await print(job, `labels-${bakedOn}.zpl`)) setQueue([]);
    setBusy(false);
  }

  if (loading) return <Loading />;

  return (
    <>
      <h1>Product labels</h1>
      <ErrorNote error={error} />
      <div className="grid labels-grid">
        <div>
          <section className="card">
            <h2>Label</h2>
            {!products?.length ? (
              <p className="muted">Add a product first.</p>
            ) : (
              <div className="form grid-form">
                <label className="span-2">
                  Product
                  <select
                    value={product?.id}
                    onChange={(e) => {
                      setProductId(e.target.value);
                      setOverrideIngredients(null);
                    }}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.is_active ? '' : ' (inactive)'}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Baked on
                  <input type="date" value={bakedOn} onChange={(e) => setBakedOn(e.target.value)} />
                </label>
                <label>
                  Copies
                  <input type="number" min={1} max={500} value={copies} onChange={(e) => setCopies(Number(e.target.value) || 1)} />
                </label>
                <label className="check">
                  <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> Show price
                </label>
                <label className="span-2">
                  Ingredient statement{' '}
                  <small className="muted">(auto from recipe — edit to override for this print)</small>
                  <textarea
                    rows={3}
                    value={overrideIngredients ?? autoIngredients}
                    onChange={(e) => setOverrideIngredients(e.target.value)}
                  />
                </label>
                {product && !product.recipe && (
                  <p className="alert warn span-2">This product has no recipe linked, so there are no ingredients.</p>
                )}
              </div>
            )}
            {product && (
              <>
                <LabelPreview zpl={zpl} settings={settings} />
                <div className="row wrap">
                  <button className="btn" onClick={() => print(zpl, `${product.sku || product.name}.zpl`)}>
                    Print {copies} label{copies > 1 ? 's' : ''}
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() => setQueue((q) => [...q, { productId: product.id, copies }])}
                  >
                    Add to batch
                  </button>
                  <button className="btn ghost" onClick={() => downloadZpl(zpl, `${product.sku || product.name}.zpl`)}>
                    Download ZPL
                  </button>
                </div>
                <details>
                  <summary>Show ZPL</summary>
                  <pre className="code">{zpl}</pre>
                </details>
              </>
            )}
          </section>

          {queue.length > 0 && (
            <section className="card">
              <h2>Morning batch</h2>
              <table className="table">
                <tbody>
                  {queue.map((q, i) => (
                    <tr key={i}>
                      <td>{byId.get(q.productId)?.name}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          className="qty-input"
                          value={q.copies}
                          onChange={(e) =>
                            setQueue((all) => all.map((r, j) => (j === i ? { ...r, copies: Number(e.target.value) || 1 } : r)))
                          }
                        />
                      </td>
                      <td>
                        <button className="btn small ghost" onClick={() => setQueue((all) => all.filter((_, j) => j !== i))}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn" disabled={busy} onClick={printQueue}>
                Print batch ({queue.reduce((n, q) => n + q.copies, 0)} labels)
              </button>
            </section>
          )}
        </div>
        <PrinterPanel />
      </div>
    </>
  );
}
