// api/auth.js
import { getDb, cors } from './_db.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const db = await getDb();
  const col = db.collection('config');

  // POST /api/auth — verify credentials, return token (password itself as Bearer)
  if (req.method === 'POST') {
    const { user, pass } = req.body || {};
    const cfg = await col.findOne({ _id: 'admin' });
    const storedUser = cfg?.user || 'admin';
    const storedPass = cfg?.pass || 'nre@2026';

    if (user === storedUser && pass === storedPass) {
      return res.json({ ok: true, token: storedPass });
    }
    return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  }

  // PUT /api/auth — change credentials (requires old pass as Bearer)
  if (req.method === 'PUT') {
    const auth = req.headers.authorization || '';
    const token = auth.replace('Bearer ', '').trim();
    const cfg = await col.findOne({ _id: 'admin' });
    const storedPass = cfg?.pass || 'nre@2026';

    if (token !== storedPass) {
      return res.status(401).json({ error: 'Unauthorised' });
    }
    const { newUser, newPass } = req.body || {};
    if (!newUser || !newPass || newPass.length < 6) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    await col.updateOne(
      { _id: 'admin' },
      { $set: { user: newUser, pass: newPass } },
      { upsert: true }
    );
    return res.json({ ok: true });
  }

  res.status(405).end();
}
