// api/stock.js
// PATCH /api/stock?id=p1  { stock: 50 }         ← admin manual update (requires auth)
// POST  /api/stock/deduct { items:[{id,qty}] }   ← billing deduction (no auth needed)
import { getDb, cors, authAdmin } from './_db.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const db = await getDb();

  // ── PATCH: admin-only manual stock override ──────────────────
  if (req.method === 'PATCH') {
    if (!await authAdmin(req, res, db)) return;
    const { id } = req.query;
    const { stock } = req.body;
    await db.collection('products').updateOne(
      { _id: id },
      { $set: { stock: parseInt(stock) || 0 } }
    );
    return res.json({ ok: true });
  }

  // ── POST: billing deduction — no auth needed, called on invoice ─
  // Body: { items: [ { id: "p1", qty: 2 }, ... ] }
  if (req.method === 'POST') {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }
    const col = db.collection('products');
    const results = [];
    for (const { id, qty } of items) {
      if (!id || !qty) continue;
      try {
        // Use $inc to decrement; floor at 0
        const prod = await col.findOne({ _id: id });
        if (!prod) continue;
        const newStock = Math.max(0, (prod.stock || 0) - qty);
        await col.updateOne({ _id: id }, { $set: { stock: newStock } });
        results.push({ id, newStock });
      } catch (e) {
        results.push({ id, error: e.message });
      }
    }
    return res.json({ ok: true, results });
  }

  res.status(405).end();
}
