# Mini E-commerce - Full Clean Merge with Admin Protection

This package includes the merged frontend and backend project with:

- Protected React routes for customer pages and admin-only pages.
- Admin dashboard route available only when `user.role === "admin"`.
- Navbar hides Admin/Admin Settings for normal users.
- Laravel Sanctum protected API routes.
- Laravel `admin` middleware protecting admin-only endpoints such as stats, product/category management, users, and order updates.
- Pro admin dashboard with stats, revenue chart, order status, recent orders, and top products from `order_items`.
- Shop products page with category filters.

## Important setup

Backend:
```bash
cd ecommerce-backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

Frontend:
```bash
cd ecommerce-frontend
npm install
npm run dev
```

Make sure your admin user has:
```text
role = admin
```

Normal users will be redirected away from `/admin` and admin API calls will return `403`.
