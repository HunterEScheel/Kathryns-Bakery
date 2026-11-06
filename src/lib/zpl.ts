/**
 * ZPL II label builders for the Zebra GK420d (203 dpi = 8 dots/mm).
 * The GK420d prints up to 4.09" wide; common bakery stock is 2.25"x1.25", 3"x2" or 4"x3".
 */
import type { Ingredient, Product, RecipeIngredient } from './types';

export const DPI = 203;

export interface LabelSettings {
  widthIn: number;
  heightIn: number;
  darkness: number; // 0-30
  speed: number; // 2-5 ips for GK420d
  mediaType: 'T' | 'D'; // T = thermal transfer (ribbon), D = direct thermal
  bakeryName: string;
}

export const DEFAULT_LABEL_SETTINGS: LabelSettings = {
  widthIn: 3,
  heightIn: 2,
  darkness: 15,
  speed: 3,
  mediaType: 'D',
  bakeryName: "Kathryn's Bakery",
};

export const LABEL_PRESETS: { label: string; w: number; h: number }[] = [
  { label: '2.25" x 1.25"', w: 2.25, h: 1.25 },
  { label: '2" x 1"', w: 2, h: 1 },
  { label: '3" x 2"', w: 3, h: 2 },
  { label: '4" x 2"', w: 4, h: 2 },
  { label: '4" x 3"', w: 4, h: 3 },
  { label: '4" x 6"', w: 4, h: 6 },
];

const dots = (inches: number) => Math.round(inches * DPI);

/** Escape field data for use with ^FH_ (hex-escape the control characters). */
export function esc(s: string): string {
  return s.replace(/[_^~\\]/g, (c) => '_' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
}

function header(s: LabelSettings, copies: number) {
  const pw = Math.min(dots(s.widthIn), 832);
  const ll = dots(s.heightIn);
  return [
    '^XA',
    '^CI28', // UTF-8
    `^MT${s.mediaType}`,
    `^PW${pw}`,
    `^LL${ll}`,
    '^LH0,0',
    `~SD${String(Math.max(0, Math.min(30, s.darkness))).padStart(2, '0')}`,
    `^PR${Math.max(2, Math.min(5, s.speed))}`,
    `^PQ${Math.max(1, Math.floor(copies))},0,1,Y`,
  ];
}

/** Text field. If `width` is given the text wraps in a field block. */
function text(x: number, y: number, h: number, value: string, opts: { width?: number; lines?: number; align?: 'L' | 'C' | 'R' } = {}) {
  const fb = opts.width ? `^FB${opts.width},${opts.lines ?? 1},0,${opts.align ?? 'L'},0` : '';
  return `^FO${x},${y}^A0N,${h},${Math.round(h * 0.9)}${fb}^FH_^FD${esc(value)}^FS`;
}

/** Rough line-count estimate for font 0 (proportional; avg glyph ≈ 0.5 × height). */
function estimateLines(value: string, widthDots: number, h: number) {
  const charsPerLine = Math.max(1, Math.floor(widthDots / (h * 0.5)));
  const words = value.split(/\s+/);
  let lines = 1;
  let cur = 0;
  for (const w of words) {
    const len = w.length + (cur ? 1 : 0);
    if (cur + len > charsPerLine) {
      lines += Math.ceil(w.length / charsPerLine);
      cur = w.length % charsPerLine;
    } else cur += len;
  }
  return lines;
}

/** Pick the largest font (from max down to min) that fits `value` in the box. */
function fitText(value: string, widthDots: number, heightDots: number, max: number, min: number) {
  for (let h = max; h >= min; h -= 2) {
    const lines = estimateLines(value, widthDots, h);
    if (lines * h <= heightDots) return { h, lines };
  }
  return { h: min, lines: Math.max(1, Math.floor(heightDots / min)) };
}

const TO_GRAMS: Record<string, number> = { g: 1, gram: 1, grams: 1, kg: 1000, oz: 28.3495, lb: 453.592, lbs: 453.592 };

/**
 * Ingredient statement in descending order by weight when every line has a weight unit;
 * otherwise keeps the recipe order (admins should enter recipes heaviest-first).
 */
export function ingredientStatement(items: RecipeIngredient[]): { ingredients: string; allergens: string[] } {
  const rows = items.filter((r) => r.ingredient) as (RecipeIngredient & { ingredient: Ingredient })[];
  const allWeighed = rows.length > 0 && rows.every((r) => r.quantity != null && r.unit && TO_GRAMS[r.unit.toLowerCase()]);
  const sorted = [...rows].sort((a, b) =>
    allWeighed
      ? b.quantity! * TO_GRAMS[b.unit!.toLowerCase()] - a.quantity! * TO_GRAMS[a.unit!.toLowerCase()]
      : a.position - b.position,
  );
  const allergens = [...new Set(sorted.flatMap((r) => r.ingredient.allergens ?? []))].sort();
  return { ingredients: sorted.map((r) => r.ingredient.name).join(', '), allergens };
}

export interface ProductLabelData {
  product: Product;
  ingredients: string;
  allergens: string[];
  bakedOn: string; // display string
  bestBy?: string;
  showPrice: boolean;
  copies: number;
}

export function productLabel(s: LabelSettings, d: ProductLabelData): string {
  const W = Math.min(dots(s.widthIn), 832);
  const H = dots(s.heightIn);
  const m = Math.round(DPI * 0.08); // margin
  const inner = W - m * 2;
  const small = H < 300; // ~1.5" tall or less → compact layout
  const out = header(s, d.copies);

  let y = m;
  const titleH = small ? 28 : 40;
  out.push(text(m, y, titleH, d.product.name, { width: inner, lines: 1 }));
  y += titleH + 4;

  const sub = [s.bakeryName, d.product.net_weight ? `Net Wt ${d.product.net_weight}` : ''].filter(Boolean).join('  ·  ');
  const subH = small ? 16 : 20;
  out.push(text(m, y, subH, sub, { width: inner }));
  y += subH + 4;
  out.push(`^FO${m},${y}^GB${inner},2,2^FS`);
  y += 8;

  // Footer: dates / price / barcode
  const footH = small ? 18 : 22;
  const barH = d.product.sku && !small ? 50 : 0;
  const footerTop = H - m - footH - (barH ? barH + 24 : 0);

  const contains = d.allergens.length ? `CONTAINS: ${d.allergens.join(', ').toUpperCase()}` : '';
  const containsH = small ? 16 : 20;
  const containsBlock = contains ? containsH * 2 + 4 : 0;

  const ingText = d.ingredients ? `Ingredients: ${d.ingredients}` : '';
  const ingSpace = footerTop - y - containsBlock - 6;
  if (ingText && ingSpace > 10) {
    const f = fitText(ingText, inner, ingSpace, small ? 18 : 24, 12);
    out.push(text(m, y, f.h, ingText, { width: inner, lines: f.lines }));
    y += f.lines * f.h + 4;
  }
  if (contains) {
    const lines = estimateLines(contains, inner, containsH) > 1 ? 2 : 1;
    out.push(text(m, y, containsH, contains, { width: inner, lines }));
  }

  let fy = footerTop;
  if (barH && d.product.sku) {
    out.push(`^FO${m},${fy}^BY2,2,${barH}^BCN,${barH},Y,N,N^FH_^FD${esc(d.product.sku)}^FS`);
    fy += barH + 24;
  }
  const dates = [`Baked ${d.bakedOn}`, d.bestBy ? `Best by ${d.bestBy}` : ''].filter(Boolean).join('   ');
  out.push(text(m, fy, footH, dates, { width: inner, align: 'L' }));
  if (d.showPrice && d.product.price != null) {
    out.push(text(m, fy, footH + 6, `$${d.product.price.toFixed(2)}`, { width: inner, align: 'R' }));
  }

  out.push('^XZ');
  return out.join('\n');
}

export interface InventoryLabelData {
  name: string;
  sku?: string | null;
  location?: string | null;
  receivedOn: string;
  expiresOn?: string | null;
  qty?: string;
  copies: number;
}

export function inventoryLabel(s: LabelSettings, d: InventoryLabelData): string {
  const W = Math.min(dots(s.widthIn), 832);
  const H = dots(s.heightIn);
  const m = Math.round(DPI * 0.08);
  const inner = W - m * 2;
  const small = H < 300;
  const out = header(s, d.copies);
  let y = m;

  const titleH = small ? 30 : 44;
  out.push(text(m, y, titleH, d.name, { width: inner, lines: 2 }));
  y += titleH * (estimateLines(d.name, inner, titleH) > 1 ? 2 : 1) + 6;

  const lineH = small ? 18 : 24;
  const rows = [
    `Received: ${d.receivedOn}`,
    d.expiresOn ? `Use by: ${d.expiresOn}` : '',
    d.qty ? `Qty: ${d.qty}` : '',
    d.location ? `Loc: ${d.location}` : '',
  ].filter(Boolean);
  for (const r of rows) {
    out.push(text(m, y, lineH, r, { width: inner }));
    y += lineH + 4;
  }
  if (d.sku) {
    const barH = Math.max(30, Math.min(80, H - y - m - 26));
    if (barH >= 30) out.push(`^FO${m},${y + 4}^BY2,2,${barH}^BCN,${barH},Y,N,N^FH_^FD${esc(d.sku)}^FS`);
  }
  out.push('^XZ');
  return out.join('\n');
}

/** Calibrate media length / gap sensing (equivalent to the feed-button calibration). */
export const CALIBRATE_ZPL = '~JC^XA^JUS^XZ';
/** Prints the printer configuration label. */
export const CONFIG_LABEL_ZPL = '~WC';

/** Labelary preview URL (free online ZPL renderer) for the given settings. */
export function labelaryUrl(s: LabelSettings) {
  return `https://api.labelary.com/v1/printers/8dpmm/labels/${s.widthIn}x${s.heightIn}/0/`;
}
