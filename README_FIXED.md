# Mini E-commerce Fixed Package

## Fixed
- Admin dashboard uses API data.
- Recent Orders shows username only, no user image.
- Top Products are calculated from `order_items` with product relation.
- Order Management page updated with API orders and editable status.
- Product Management page updated with live products/categories and create/delete product.
- Customer Insights page added with users list and role update.
- Backend added admin user endpoints and order status update endpoints.

## New backend endpoints
- `GET /api/users` admin only
- `PUT /api/users/{user}` admin only
- `PATCH /api/users/{user}/role` admin only
- `PATCH /api/orders/{order}/status` admin only
- `PUT /api/orders/{order}` admin only

## Run backend
```bash
cd ecommerce-backend
composer install
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

Admin login seeded:
- email: `admin@example.com`
- password: `password123`

## Run frontend
```bash
cd ecommerce-frontend
npm install
npm run dev
```

Make sure frontend `.env` has:
```env
VITE_API_URL=http://127.0.0.1:8000/api
```
