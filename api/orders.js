// api/orders.js
import { getDb, cors, authAdmin } from './_db.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const db = await getDb();
  const col = db.collection('orders');

  // Ensure unique index on billNo (safe to call repeatedly — no-op if exists)
  await col.createIndex({ billNo: 1 }, { unique: true, sparse: true }).catch(() => {});

  // GET — public read (for invoice reprint)
  if (req.method === 'GET') {
    const { billNo } = req.query;
    if (billNo) {
      const order = await col.findOne({ billNo });
      return res.json(order || null);
    }
    // List all — requires admin auth
    if (!await authAdmin(req, res, db)) return;
    const orders = await col.find({}).sort({ createdAt: -1 }).toArray();
    return res.json(orders);
  }

  // POST — create new order (public — anyone billing from site)
  if (req.method === 'POST') {
    const order = {
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    try {
      await col.insertOne(order);
      return res.status(201).json({ ok: true, billNo: order.billNo });
    } catch (e) {
      if (e.code === 11000) {
        return res.status(409).json({ error: 'Duplicate bill number. Please try again.' });
      }
      throw e;
    }
  }

  // DELETE — admin only
  if (req.method === 'DELETE') {
    if (!await authAdmin(req, res, db)) return;
    const { billNo } = req.query;
    if (billNo) {
      await col.deleteOne({ billNo });
    } else {
      await col.deleteMany({});
    }
    return res.json({ ok: true });
  }

  res.status(405).end();
}
