// api/orders.js
import { getDb, cors, authAdmin } from './_db.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const db = await getDb();
  const col = db.collection('orders');

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
    await col.insertOne(order);
    return res.status(201).json({ ok: true, billNo: order.billNo });
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
