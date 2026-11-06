# MyShop — E-commerce app (Core PHP + Next.js + PostgreSQL)

```
ecommerce/
├── database/     schema.sql, seed.sql
├── backend/      Core PHP REST API (PHP 7.4+, no framework, no Composer needed)
└── frontend/     Next.js 14 (App Router)
```

## Features
- Home page with product listing, search and pagination
- Product details page
- Cart (stored in the browser), checkout with shipping details
- Payment: Stripe Checkout (or a built-in MOCK payment if no Stripe key is set)
- Registration / login (bcrypt passwords, JWT tokens)
- My orders page
- Admin product management (add / edit / delete) at `/admin`

## 1. Database
Requires the `pdo_pgsql` PHP extension (enable `extension=pdo_pgsql` in php.ini; in XAMPP it is bundled).

```bash
createdb shop
psql -d shop -f database/schema.sql
psql -d shop -f database/seed.sql      # optional sample products
```

## 2. Backend (port 8000)
```bash
cd backend
cp .env.example .env        # edit DB credentials, JWT_SECRET, ADMIN_EMAIL
php -S localhost:8000 -t public public/index.php
```
Quick check: http://localhost:8000/api/products

(With Apache/XAMPP, point the document root or a virtual host to `backend/public` — `.htaccess` is included.)

## 3. Frontend (port 3000)
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```
Open http://localhost:3000

## Admin access
Register an account using the email you put in `ADMIN_EMAIL` in `backend/.env`.
That user gets the `admin` role and sees an **Admin** link in the navbar.

## Payments
- **No `STRIPE_SECRET_KEY`** → mock mode: checkout redirects straight to the success page and the order is marked paid. Development only.
- **With `STRIPE_SECRET_KEY=sk_test_...`** → real Stripe Checkout. After payment Stripe redirects to
  `/checkout/success`, which asks the backend to verify the session with Stripe before marking the order paid.
  Use test card `4242 4242 4242 4242`.

## API summary
| Method | Endpoint | Auth |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | – |
| GET | /api/auth/me | user |
| GET | /api/products?search=&page= , /api/products/{id} | – |
| POST / PUT / DELETE | /api/products, /api/products/{id} | admin |
| POST | /api/orders | user |
| GET | /api/orders | user |
| POST | /api/orders/{id}/verify | user |

## Security notes
- Prices are always read from the database when an order is created, never trusted from the client.
- Stock is locked and decremented inside a transaction.
- Change `JWT_SECRET` before deploying; serve over HTTPS; set `FRONTEND_URL` to your real domain.
- Orders cancelled/abandoned at the payment step stay `pending` (stock is not auto-restored) — add a cleanup job for production.
