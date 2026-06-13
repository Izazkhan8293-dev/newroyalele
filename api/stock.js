// api/stock.js  — PATCH /api/stock?id=p1  { stock: 50 }
import { getDb, cors, authAdmin } from './_db.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const db = await getDb();

  if (req.method === 'PATCH') {
    if (!await authAdmin(req, res, db)) return;
    const { id } = req.query;
    const { stock } = req.body;
    await db.collection('products').updateOne({ _id: id }, { $set: { stock: parseInt(stock) || 0 } });
    return res.json({ ok: true });
  }

  res.status(405).end();
}
