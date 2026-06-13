// api/paints.js
import { getDb, cors, authAdmin } from './_db.js';

const DEFAULT_PAINTS = [
  { _id:'paint1', name:'Blue Colour Paint',      type:'Interior', brand:'Birla Opus', colour:'#4A90D9', sizes:{'50ml':45,'100ml':80,'250ml':180,'500ml':340,'1L':620,'4L':2200,'10L':5200,'20L':9800} },
  { _id:'paint2', name:'White Emulsion',         type:'Interior', brand:'Birla Opus', colour:'#F8F8F8', sizes:{'50ml':35,'100ml':60,'250ml':140,'500ml':260,'1L':480,'4L':1700,'10L':3900,'20L':7200} },
  { _id:'paint3', name:'Yellow Sunshine',        type:'Interior', brand:'Birla Opus', colour:'#F5C518', sizes:{'50ml':50,'100ml':90,'250ml':200,'500ml':380,'1L':700,'4L':2500,'10L':5800,'20L':10500} },
  { _id:'paint4', name:'Beige Premium Exterior', type:'Exterior', brand:'Birla Opus', colour:'#D4B896', sizes:{'50ml':55,'100ml':100,'250ml':230,'500ml':440,'1L':820,'4L':3000,'10L':6800,'20L':12500} },
  { _id:'paint5', name:'Red Oxide Primer',       type:'Primer',   brand:'Birla Opus', colour:'#8B2020', sizes:{'50ml':40,'100ml':70,'250ml':160,'500ml':300,'1L':560,'4L':2000,'10L':4600,'20L':8500} },
  { _id:'paint6', name:'White Enamel Gloss',     type:'Enamel',   brand:'Birla Opus', colour:'#FAFAFA', sizes:{'50ml':60,'100ml':110,'250ml':260,'500ml':490,'1L':920,'4L':3400,'10L':7800,'20L':14000} },
  { _id:'paint7', name:'Green Forest',           type:'Interior', brand:'Birla Opus', colour:'#2D7A3A', sizes:{'50ml':48,'100ml':85,'250ml':190,'500ml':360,'1L':660,'4L':2350,'10L':5400,'20L':10000} },
  { _id:'paint8', name:'Dark Grey Exterior',     type:'Exterior', brand:'Birla Opus', colour:'#555A66', sizes:{'50ml':55,'100ml':100,'250ml':235,'500ml':450,'1L':840,'4L':3100,'10L':7000,'20L':13000} },
];

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const db = await getDb();
  const col = db.collection('paints');

  const count = await col.countDocuments();
  if (count === 0) await col.insertMany(DEFAULT_PAINTS);

  if (req.method === 'GET') {
    const paints = await col.find({}).toArray();
    return res.json(paints);
  }

  if (!await authAdmin(req, res, db)) return;

  if (req.method === 'POST') {
    const p = { ...req.body, _id: 'paint' + Date.now() };
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
