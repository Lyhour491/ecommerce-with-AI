# Mini E-commerce Full Clean Production Merge

This package includes the merged Laravel backend and React frontend.

## Added / fixed in this merge
- Pro Admin Dashboard with live stats and SVG charts.
- Admin analytics API: `GET /api/admin/stats`.
- Top products calculated from `order_items`.
- Recent Orders shows username only, no user image.
- Products API can filter by `category_id`, `category`, and `search`.
- Frontend Products page keeps category filtering, search, sort, price filter, stock filter, and product detail links.
- Role protected routing is included: normal users cannot access admin routes; admins see Admin and Admin Settings.
- Cart, checkout, test payment, user settings, admin settings, products, orders, customers, and categories are preserved.

## Frontend
```bash
cd ecommerce-frontend
npm install
npm run dev
```

Build tested with:
```bash
npm run build
```

## Backend
```bash
cd ecommerce-backend
composer install
php artisan migrate
php artisan storage:link
php artisan serve
```

## Test payment notes
- Test payment only. No real card gateway is used.
- Use any test card number except `4000000000000002`.
- `4000000000000002` simulates a declined payment.
