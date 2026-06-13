# 🚀 New Royal Electricals — Vercel + MongoDB Deployment Guide

## Project Structure
```
nre-vercel/
├── index.html          ← Frontend (your complete website)
├── vercel.json         ← Vercel routing config
├── package.json        ← Node.js dependencies
└── api/
    ├── _db.js          ← Shared MongoDB connection
    ├── auth.js         ← POST /api/auth  (admin login)
    ├── products.js     ← GET/POST/PUT/DELETE /api/products
    ├── paints.js       ← GET/POST/PUT/DELETE /api/paints
    ├── orders.js       ← GET/POST/DELETE /api/orders
    └── stock.js        ← PATCH /api/stock?id=xxx
```

---

## STEP 1 — Create MongoDB Atlas (Free Forever)

1. Go to **https://cloud.mongodb.com** → Sign up free
2. Create a **Free Cluster** (M0 Sandbox — no credit card needed)
3. Choose region: **Mumbai (ap-south-1)** for fastest speed in India
4. Cluster name: `nre-store` (or anything you want)

### Create Database User
- Left sidebar → **Database Access** → Add New User
- Username: `nre_admin`
- Password: (generate a strong one — copy it!)
- Role: **Read and Write to Any Database**
- Click **Add User**

### Allow All IPs (required for Vercel)
- Left sidebar → **Network Access** → Add IP Address
- Click **Allow Access from Anywhere** (0.0.0.0/0)
- This is needed because Vercel uses dynamic IPs

### Get Connection String
- Go to your cluster → Click **Connect**
- Choose **Connect your application**
- Driver: **Node.js**, Version: **5.5 or later**
- Copy the connection string — looks like:
  ```
  mongodb+srv://nre_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
  ```
- Replace `<password>` with your actual password

---

## STEP 2 — Deploy to Vercel

### Option A: Via Vercel CLI (recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Go into the project folder
cd nre-vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: new-royal-electricals
# - Directory: ./ (current)
# - Override settings? No
```

### Option B: Via Vercel Dashboard
1. Go to **https://vercel.com** → Sign up with GitHub
2. Push this folder to a GitHub repo
3. In Vercel → **New Project** → Import from GitHub
4. Select your repo → Deploy

---

## STEP 3 — Add Environment Variables in Vercel

This is the most important step. Without this, MongoDB won't connect.

1. In Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add these two variables:

| Name           | Value                                              |
|----------------|----------------------------------------------------|
| `MONGODB_URI`  | `mongodb+srv://nre_admin:PASSWORD@cluster0.xxx...` |
| `MONGODB_DB`   | `nre_store`                                        |

3. Set environment: **Production**, **Preview**, **Development** (check all three)
4. Click **Save**
5. Go to **Deployments** → **Redeploy** (to apply the env vars)

---

## STEP 4 — First Launch

1. Open your Vercel URL (e.g. `https://new-royal-electricals.vercel.app`)
2. The site loads — data is fetched from MongoDB
3. On first load, default products & paints are auto-seeded into MongoDB
4. Click **Admin** → Login with: `admin` / `nre@2026`
5. **Change your password immediately** in Admin → Settings tab!

---

## API Reference

| Endpoint              | Method | Auth    | Description                    |
|-----------------------|--------|---------|--------------------------------|
| `/api/products`       | GET    | None    | List all products              |
| `/api/products`       | POST   | Admin   | Add new product                |
| `/api/products`       | PUT    | Admin   | Update product                 |
| `/api/products?id=x`  | DELETE | Admin   | Delete product                 |
| `/api/paints`         | GET    | None    | List all paints                |
| `/api/paints`         | POST   | Admin   | Add paint                      |
| `/api/paints?id=x`    | DELETE | Admin   | Delete paint                   |
| `/api/orders`         | GET    | Admin   | List all orders                |
| `/api/orders`         | POST   | None    | Create new order (billing)     |
| `/api/orders?billNo=x`| GET    | None    | Get single order               |
| `/api/orders`         | DELETE | Admin   | Clear all orders               |
| `/api/stock?id=x`     | PATCH  | Admin   | Update product stock           |
| `/api/auth`           | POST   | None    | Login (returns token)          |
| `/api/auth`           | PUT    | Admin   | Change credentials             |

**Admin auth**: Send `Authorization: Bearer <password>` header.

---

## Data Persistence

✅ All data lives in MongoDB Atlas — **never deleted, accessible from any device**
✅ Products, Paints, Orders, Admin credentials — all in cloud
✅ Works across multiple browser tabs, phones, computers
✅ Free MongoDB Atlas M0 gives **512MB storage** — enough for years of orders

## MongoDB Collections Created Automatically

| Collection | Contents                        |
|------------|---------------------------------|
| `products` | All electrical/hardware items   |
| `paints`   | All paint products & sizes      |
| `orders`   | Every GST invoice ever made     |
| `config`   | Admin credentials               |

---

## Troubleshooting

**"Cannot reach server"** toast on load:
→ Check `MONGODB_URI` env var is set correctly in Vercel
→ Make sure 0.0.0.0/0 is in MongoDB Network Access

**Admin login fails**:
→ First login uses `admin` / `nre@2026`
→ If you changed it and forgot: go to MongoDB Atlas → Browse Collections → config → edit the document

**Data not appearing after redeploy**:
→ Data is in MongoDB — it persists across all deployments
→ New deployments never erase the database

---

*New Royal Electricals & Hardware, Pennadam | GSTIN: 33AACFN4722E1ZR*
