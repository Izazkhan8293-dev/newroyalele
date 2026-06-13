// api/products.js
import { getDb, cors, authAdmin } from './_db.js';
import { ObjectId } from 'mongodb';

const DEFAULT_PRODUCTS = [
  { _id:'p1',  name:'GM 6A 1-Way Switch',       category:'Electrical', brand:'GM',       rate:45,   stock:200, unit:'Piece', hsn:'8536', icon:'🔌' },
  { _id:'p2',  name:'GM 16A Socket',             category:'Electrical', brand:'GM',       rate:85,   stock:150, unit:'Piece', hsn:'8536', icon:'🔌' },
  { _id:'p3',  name:'Philips 9W LED Bulb',        category:'Lighting',   brand:'Philips',  rate:120,  stock:300, unit:'Piece', hsn:'8539', icon:'💡' },
  { _id:'p4',  name:'Crompton 20W LED Tube',      category:'Lighting',   brand:'Crompton', rate:280,  stock:80,  unit:'Piece', hsn:'8539', icon:'💡' },
  { _id:'p5',  name:'Norwood 18W LED Panel',      category:'Lighting',   brand:'Norwood',  rate:450,  stock:60,  unit:'Piece', hsn:'8539', icon:'🔆' },
  { _id:'p6',  name:'Fybros 2.5 Sq mm Wire',      category:'Cables',     brand:'Fybros',   rate:2800, stock:30,  unit:'Kg',    hsn:'8544', icon:'🔴' },
  { _id:'p7',  name:'Hi-Fi 4mm Cable (per m)',    category:'Cables',     brand:'Hi-Fi',    rate:48,   stock:500, unit:'Metre', hsn:'8544', icon:'⚡' },
  { _id:'p8',  name:'CRI 0.5HP Pump Set',         category:'Motors',     brand:'CRI',      rate:4200, stock:12,  unit:'Piece', hsn:'8413', icon:'⚙' },
  { _id:'p9',  name:'Laxmi 1HP Motor',            category:'Motors',     brand:'Laxmi',    rate:6800, stock:8,   unit:'Piece', hsn:'8413', icon:'⚙' },
  { _id:'p10', name:'1/2" PVC Pipe (3m)',         category:'PVC',        brand:'Supreme',  rate:120,  stock:100, unit:'Piece', hsn:'3917', icon:'🪠' },
  { _id:'p11', name:'1" CPVC Pipe (3m)',          category:'PVC',        brand:'Ashirvad', rate:280,  stock:60,  unit:'Piece', hsn:'3917', icon:'🪠' },
  { _id:'p12', name:'Hex Bolt Set (50pc)',         category:'Hardware',   brand:'Generic',  rate:180,  stock:5,   unit:'Box',   hsn:'7318', icon:'🔩' },
  { _id:'p13', name:'Kundan Modular Plate 6M',    category:'Electrical', brand:'Kundan',   rate:220,  stock:75,  unit:'Piece', hsn:'8536', icon:'🔌' },
  { _id:'p14', name:'MCB Single Pole 32A',        category:'Electrical', brand:'Havells',  rate:390,  stock:45,  unit:'Piece', hsn:'8536', icon:'⚡' },
];

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const db = await getDb();
  const col = db.collection('products');

  // Seed defaults if empty
  const count = await col.countDocuments();
  if (count === 0) await col.insertMany(DEFAULT_PRODUCTS);

  if (req.method === 'GET') {
    const products = await col.find({}).toArray();
    return res.json(products);
  }

  // Write operations require auth
  if (!await authAdmin(req, res, db)) return;

  if (req.method === 'POST') {
    const p = { ...req.body, _id: 'p' + Date.now() };
    await col.insertOne(p);
    return res.json(p);
  }

  if (req.method === 'PUT') {
    const { _id, ...update } = req.body;
    await col.updateOne({ _id }, { $set: update });
    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await col.deleteOne({ _id: id });
    return res.json({ ok: true });
  }

  res.status(405).end();
}
