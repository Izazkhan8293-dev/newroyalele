// api/_db.js  — shared MongoDB connection (cached across warm invocations)
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME     = process.env.MONGODB_DB || 'nre_store';

if (!MONGODB_URI) {
  throw new Error('Missing env var: MONGODB_URI  — add it in Vercel project settings.');
}

let cachedClient = null;
let cachedDb     = null;

export async function getDb() {
  if (cachedDb) return cachedDb;

  const client = await MongoClient.connect(MONGODB_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });
  cachedClient = client;
  cachedDb     = client.db(DB_NAME);
  return cachedDb;
}

/** Tiny CORS helper — call at top of every handler */
export function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

/** Verify admin password sent as Bearer token */
export async function authAdmin(req, res, db) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  const cfg = await db.collection('config').findOne({ _id: 'admin' });
  const pass = cfg?.pass || 'nre@2026';
  if (token !== pass) {
    res.status(401).json({ error: 'Unauthorised' });
    return false;
  }
  return true;
}
