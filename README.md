# Ecommerce API

Full-featured Node.js ecommerce API with Express, Prisma, MySQL, and Razorpay payment gateway.

## Tech Stack

- **Node.js** + **Express.js**
- **Prisma ORM** + **MySQL**
- **JWT** authentication
- **Razorpay** payment gateway
- **bcryptjs** password hashing

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and update:

```env
DATABASE_URL="mysql://root:yourpassword@localhost:3306/ecommerce_db"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
PORT=3000
RAZORPAY_KEY_ID="rzp_test_xxxxxxxx"
RAZORPAY_KEY_SECRET="your_razorpay_secret_key"
REDIS_URL="redis://localhost:6379"
REDIS_DEFAULT_TTL=300
```

Get Razorpay test keys from [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys).

### Redis cache (optional)

Install and run Redis locally, or use a hosted instance. Set `REDIS_URL` in `.env`. If Redis is unavailable or `REDIS_URL` is omitted, the API still works and reads go directly to MySQL.

Cached endpoints:

- `GET /api/products` and `GET /api/products/:id` (TTL 120s)
- `GET /api/dashboard` and `GET /api/dashboard/admin` (TTL 60s)

Cache is cleared when products or orders change. Check `X-Cache: HIT` or `MISS` on responses, and `GET /health` for `redis: connected | disabled`.

### 3. Create MySQL database

```sql
CREATE DATABASE ecommerce_db;
```

### 4. Run Prisma migrations

```bash
npx prisma migrate dev --name ecommerce_full
npx prisma generate
```

### 5. Start the server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

## API Endpoints

### Health Check

| Method | Endpoint  | Auth | Description       |
|--------|-----------|------|-------------------|
| GET    | `/health` | No   | API health status |

### Authentication

| Method | Endpoint             | Auth | Description         |
|--------|----------------------|------|---------------------|
| POST   | `/api/auth/register` | No   | Register new user   |
| POST   | `/api/auth/login`    | No   | Login and get token |

### Products

| Method | Endpoint            | Auth  | Description              |
|--------|---------------------|-------|--------------------------|
| GET    | `/api/products`     | No    | List products (paginated)|
| GET    | `/api/products/:id` | No    | Get product details      |
| POST   | `/api/products`     | Admin | Add product              |
| PUT    | `/api/products/:id` | Admin | Edit product             |
| DELETE | `/api/products/:id` | Admin | Delete product           |

`GET /api/products` query: `page`, `limit`, `search`, **`categoryId`** (filter by category).

Create/update product (multipart or JSON): include **`categoryId`** (required on create).

### Categories

| Method | Endpoint               | Auth  | Description        |
|--------|------------------------|-------|--------------------|
| GET    | `/api/categories`      | No    | List all categories|
| GET    | `/api/categories/:id`  | No    | Get category       |
| POST   | `/api/categories`      | Admin | Create category    |
| PUT    | `/api/categories/:id`  | Admin | Update category    |
| DELETE | `/api/categories/:id`  | Admin | Delete category    |

### Cart

| Method | Endpoint                  | Auth | Description           |
|--------|---------------------------|------|-----------------------|
| GET    | `/api/cart`               | Yes  | Get cart              |
| POST   | `/api/cart`               | Yes  | Add item to cart      |
| PUT    | `/api/cart/:productId`    | Yes  | Update item quantity  |
| DELETE | `/api/cart/:productId`   | Yes  | Remove item from cart |
| DELETE | `/api/cart`               | Yes  | Clear cart            |

### Checkout & Payment

| Method | Endpoint                      | Auth | Description                    |
|--------|-------------------------------|------|--------------------------------|
| POST   | `/api/checkout`               | Yes  | Create order from cart         |
| POST   | `/api/payments/create-order`  | Yes  | Create Razorpay payment order  |
| POST   | `/api/payments/verify`        | Yes  | Verify Razorpay payment        |

### Orders

| Method | Endpoint                  | Auth  | Description              |
|--------|---------------------------|-------|--------------------------|
| GET    | `/api/orders/my`          | Yes   | Get user's orders        |
| GET    | `/api/orders/:id`         | Yes   | Get order details        |
| PUT    | `/api/orders/:id/cancel`  | Yes   | Cancel order             |
| GET    | `/api/orders/admin/all`   | Admin | Get all orders           |
| PUT    | `/api/orders/:id/status`  | Admin | Update order status      |

### Dashboard

| Method | Endpoint               | Auth  | Description                   |
|--------|------------------------|-------|-------------------------------|
| GET    | `/api/dashboard`       | Yes   | Customer dashboard            |
| GET    | `/api/dashboard/admin` | Admin | Admin dashboard (store stats) |

## Complete Purchase Flow

### 1. Browse products

```bash
GET /api/products?page=1&limit=12&search=headphones
```

### 2. Register / Login

```bash
POST /api/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "password123" }
```

### 3. Add to cart

```bash
POST /api/cart
Authorization: Bearer <token>
Content-Type: application/json

{ "productId": 1, "quantity": 2 }
```

### 4. Checkout (create order)

```bash
POST /api/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "shippingAddress": "123 Main Street",
  "shippingCity": "Mumbai",
  "shippingState": "Maharashtra",
  "shippingZip": "400001",
  "shippingPhone": "9876543210",
  "paymentMethod": "RAZORPAY"
}
```

`paymentMethod`: **`RAZORPAY`** (default) or **`COD`**.

| Method | Behavior |
|--------|----------|
| **RAZORPAY** | Order `PENDING`, payment `PENDING`, stock reduced after Razorpay verify |
| **COD** | Order `CONFIRMED`, payment `PENDING`, stock reduced immediately; pay cash on delivery |

**Cash on Delivery example:**

```bash
POST /api/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "shippingAddress": "123 Main Street",
  "shippingCity": "Mumbai",
  "shippingState": "Maharashtra",
  "shippingZip": "400001",
  "shippingPhone": "9876543210",
  "paymentMethod": "COD"
}
```

When admin sets order status to **`DELIVERED`**, COD orders automatically get **`paymentStatus: PAID`**.

### 5. Create Razorpay order

```bash
POST /api/payments/create-order
Authorization: Bearer <token>
Content-Type: application/json

{ "orderId": 1 }
```

Response includes `razorpayOrderId` and `keyId` for frontend checkout.

### 6. Frontend Razorpay checkout (example)

```javascript
const options = {
  key: response.data.keyId,
  amount: response.data.amount * 100,
  currency: "INR",
  name: "Ecommerce Store",
  order_id: response.data.razorpayOrderId,
  handler: async function (razorpayResponse) {
    await fetch("/api/payments/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderId: response.data.orderId,
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature,
      }),
    });
  },
};
const rzp = new Razorpay(options);
rzp.open();
```

### 7. Verify payment

```bash
POST /api/payments/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": 1,
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}
```

On success: order status becomes `CONFIRMED`, payment status `PAID`, and stock is reduced.

## Project Structure

```
├── prisma/
│   └── schema.prisma
├── src/
│   ├── controllers/
│   ├── lib/
│   ├── middleware/
│   ├── routes/
│   └── index.js
├── .env.example
└── package.json
```

## Database Models

- **User** — customers and admins
- **Product** — store products
- **Cart / CartItem** — shopping cart
- **Order / OrderItem** — orders with shipping and payment info
- **PaymentStatus** — PENDING, PAID, FAILED

## Admin Setup

Registration creates `CUSTOMER` users. Promote a user to admin:

```sql
UPDATE User SET role = 'ADMIN' WHERE email = 'admin@example.com';
```
