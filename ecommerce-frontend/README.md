# ShopVerse — React Ecommerce Frontend

React (Vite) storefront that connects to the Node.js + Express + Prisma API in the parent folder.

## Features

- Product catalog with search and pagination
- User registration and login (JWT)
- Shopping cart
- Checkout with shipping form and Razorpay payment (when API keys are configured)
- **Cash on delivery (COD)** at checkout — no Razorpay step; pay when the order is delivered
- Customer dashboard and order history
- Admin: dashboard, product CRUD, order status management

## Setup

### 1. Start the API

From the repo root (`nodeapplication inprisma`):

```bash
npm run dev
```

API runs at `http://localhost:3000`.

### 2. Configure frontend

```bash
cd ecommerce-frontend
cp .env.example .env
```

Default `VITE_API_URL=http://localhost:3000`. Vite also proxies `/api` to the backend during development.

### 3. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Admin access

Register a user, then promote them in MySQL:

```sql
UPDATE User SET role = 'ADMIN' WHERE email = 'your@email.com';
```

Log in again to see admin navigation.

## Admin panel

Log in as a user with `ADMIN` role, then open **Admin panel** in the navbar (or go to `/admin`).

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard — stats, recent orders |
| `/admin/products` | Add, edit, delete products |
| `/admin/orders` | All orders, filter by status |
| `/admin/orders/:id` | Order detail, update status |

The admin area uses a separate layout (sidebar + top bar), not the shop header.

Promote a user in MySQL:

```sql
UPDATE User SET role = 'ADMIN' WHERE email = 'your@email.com';
```

Log in again after changing role.

## Project layout

```
ecommerce-frontend/
├── src/
│   ├── api/client.js       # API helpers
│   ├── context/            # Auth & cart state
│   ├── components/         # Layout, navbar, routes
│   └── pages/              # Route screens
├── vite.config.js
└── .env.example
```
