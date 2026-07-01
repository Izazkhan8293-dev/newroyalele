// api/bulk-import.js
// POST /api/bulk-import
// Body: { items: Array<ImportRow>, mode: 'paints' | 'products' | 'inventory' }
//
// Handles the Master Inventory Excel format:
//   Columns: #, Category, Product Name, Size, Stock Qty, Unit Price (₹), Total Value (₹), Status
//
// For 'inventory' mode (Master_Inventory.xlsx):
//   - Paint rows  → upserted into the `paints` collection
//     Paint categories: Enamel Paints, Distemper, Style Interior Emulsion,
//     All Dry Waterproof Coating, Calista Exterior Emulsion, Style Exterior Emulsion,
//     Primers (Style / Calista)
//   - Belt rows   → upserted into the `products` collection (category: Belts)
//   - Spanner rows → upserted into the `products` collection (category: Hardware)
//
// Returns: { ok, paintsAdded, paintsUpdated, productsAdded, productsUpdated, errors }

import { getDb, cors, authAdmin } from './_db.js';

// ── Category classification ───────────────────────────────────────────────────
const PAINT_CATEGORIES = new Set([
  'Enamel Paints',
  'Distemper',
  'Style Interior Emulsion',
  'All Dry Waterproof Coating',
  'Calista Exterior Emulsion',
  'Style Exterior Emulsion',
  'Primers (Style / Calista)',
]);

function isPaintCategory(cat) {
  if (!cat) return false;
  const c = cat.trim();
  if (PAINT_CATEGORIES.has(c)) return true;
  const cl = c.toLowerCase();
  return cl.includes('enamel') || cl.includes('emulsion') ||
    cl.includes('primer') || cl.includes('distemper') ||
    cl.includes('waterproof') || cl.includes('paint');
}

function isBeltCategory(cat) {
  if (!cat) return false;
  const cl = cat.trim().toLowerCase();
  return cl.includes('belt') || cl.startsWith('series a') || cl.startsWith('series b');
}

function isSpannerCategory(cat) {
  if (!cat) return false;
  const cl = cat.trim().toLowerCase();
  return cl.includes('spanner') || cl.includes('ring spanner') ||
    cl.includes('open') && cl.includes('spanner');
}

// ── Paint type mapping from category ─────────────────────────────────────────
function paintTypeFromCategory(cat) {
  if (!cat) return 'Other';
  const cl = cat.toLowerCase();
  if (cl.includes('enamel')) return 'Enamel';
  if (cl.includes('distemper')) return 'Distemper';
  if (cl.includes('interior')) return 'Interior';
  if (cl.includes('exterior')) return 'Exterior';
  if (cl.includes('primer')) return 'Primer';
  if (cl.includes('waterproof')) return 'Waterproof';
  return 'Other';
}

// ── Brand inference ───────────────────────────────────────────────────────────
function inferBrand(category, name) {
  if (!name) return 'Local';
  const n = name.toLowerCase();
  const c = (category || '').toLowerCase();
  if (n.startsWith('apsara') || c.includes('enamel paints')) return 'Apsara';
  if (n.startsWith('style') || n.includes('style ')) return 'Style';
  if (n.startsWith('calista') || n.includes('calista ')) return 'Calista';
  if (n.startsWith('all dry') || c.includes('waterproof')) return 'All Dry';
  return 'Local';
}

// ── Normalise a row object (trim keys, lowercase) ─────────────────────────────
function norm(raw) {
  const out = {};
  Object.keys(raw).forEach(k => {
    out[k.trim().toLowerCase().replace(/\s+/g, ' ')] = raw[k];
  });
  return out;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();

  // Auth required
  const db = await getDb();
  if (!await authAdmin(req, res, db)) return;

  const { items, mode = 'inventory' } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required and must not be empty' });
  }

  const paintCol   = db.collection('paints');
  const productCol = db.collection('products');

  let paintsAdded = 0, paintsUpdated = 0;
  let productsAdded = 0, productsUpdated = 0;
  const errors = [];

  // Group paint rows by (brand + productName) so we can collect all sizes
  // Key: `${category}|${productName}` → { category, name, sizes: { size: qty } }
  const paintGroups = new Map();
  const productRows = []; // belts, spanners

  for (const raw of items) {
    const row = norm(raw);

    // Accept both column names used by Master_Inventory.xlsx
    const rowNum   = row['#'] || '';
    const category = String(row['category'] || '').trim();
    const prodName = String(row['product name'] || row['name'] || '').trim();
    const size     = String(row['size'] || '').trim();
    const stockQty = parseInt(row['stock qty'] || row['stock'] || 0) || 0;
    const unitPrice= parseFloat(row['unit price (₹)'] || row['unit price'] || row['rate'] || 0) || 0;
    const status   = String(row['status'] || '').trim();

    // Skip header / subtotal / empty rows
    if (!prodName || !category) continue;
    if (prodName.toLowerCase().includes('subtotal')) continue;
    if (prodName.toLowerCase().includes('total')) continue;
    if (prodName.toLowerCase().includes('grand total')) continue;
    if (prodName.toLowerCase().startsWith('new royal')) continue; // title row

    if (isPaintCategory(category)) {
      // Accumulate paint sizes
      const key = `${category}|${prodName}`;
      if (!paintGroups.has(key)) {
        paintGroups.set(key, { category, name: prodName, sizes: {}, totalStock: 0 });
      }
      const pg = paintGroups.get(key);
      if (size) pg.sizes[size] = stockQty;
      pg.totalStock += stockQty;

    } else if (isBeltCategory(category) || isSpannerCategory(category)) {
      productRows.push({ category, name: prodName, size, stock: stockQty, unitPrice });
    }
    // else: ignore (extra materials rows etc.)
  }

  // ── Upsert paint groups ───────────────────────────────────────────────────
  for (const [key, pg] of paintGroups) {
    try {
      const paintType = paintTypeFromCategory(pg.category);
      const brand     = inferBrand(pg.category, pg.name);

      const existing = await paintCol.findOne({ name: pg.name });
      if (existing) {
        // Merge sizes (don't overwrite sizes that already have prices)
        const mergedSizes = { ...existing.sizes };
        for (const [sz, qty] of Object.entries(pg.sizes)) {
          if (mergedSizes[sz] === undefined) {
            mergedSizes[sz] = 0; // keep price as-is (0 means not priced yet)
          }
          // We don't update price here — only stock through separate stock update
        }
        await paintCol.updateOne(
          { _id: existing._id },
          { $set: { category: pg.category, type: paintType, brand, sizes: mergedSizes, stock: pg.totalStock } }
        );
        paintsUpdated++;
      } else {
        // Build sizes map with 0 price (to be filled in manually)
        const sizesWithPrice = {};
        for (const sz of Object.keys(pg.sizes)) {
          sizesWithPrice[sz] = 0; // price TBD
        }
        const newPaint = {
          _id: 'paint_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name: pg.name,
          category: pg.category,
          type: paintType,
          brand,
          colour: '#CCCCCC', // placeholder — update manually
          sizes: sizesWithPrice,
          stock: pg.totalStock,
        };
        await paintCol.insertOne(newPaint);
        paintsAdded++;
      }
    } catch (e) {
      errors.push({ item: pg.name, error: e.message });
    }
  }

  // ── Upsert belt / spanner products ───────────────────────────────────────
  for (const pr of productRows) {
    try {
      // Key: category + name + size as a combined product name
      const fullName = `${pr.name} (${pr.size})`;
      const catMapped = isBeltCategory(pr.category) ? 'Belts' : 'Hardware';
      const icon = isBeltCategory(pr.category) ? '⚙️' : '🔧';

      const existing = await productCol.findOne({
        name: { $regex: new RegExp('^' + escapeRegex(fullName) + '$', 'i') }
      });

      if (existing) {
        await productCol.updateOne(
          { _id: existing._id },
          { $set: { stock: pr.stock, rate: pr.unitPrice || existing.rate || 0 } }
        );
        productsUpdated++;
      } else {
        const newProduct = {
          _id: 'prod_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name: fullName,
          category: catMapped,
          brand: 'Generic',
          rate: pr.unitPrice || 0,
          stock: pr.stock,
          unit: isBeltCategory(pr.category) ? 'Piece' : 'Piece',
          hsn: isBeltCategory(pr.category) ? '4010' : '8204',
          icon,
        };
        await productCol.insertOne(newProduct);
        productsAdded++;
      }
    } catch (e) {
      errors.push({ item: `${pr.category} / ${pr.name} / ${pr.size}`, error: e.message });
    }
  }

  return res.json({
    ok: true,
    paintsAdded,
    paintsUpdated,
    productsAdded,
    productsUpdated,
    errors: errors.slice(0, 20), // cap error list
  });
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
