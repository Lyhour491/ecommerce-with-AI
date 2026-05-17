# Ecommerce Frontend

Modern React frontend for the Mini E-commerce Laravel API.

## Run

```bash
npm install
npm run dev
```

Create `.env` from `.env.example` if your backend URL is different.

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

## Important CORS note

If add product returns `net::ERR_FAILED 200 (OK)` with CORS message, the product may be created in Laravel but the browser blocks the response. Fix Laravel CORS using `CORS_FIX_LARAVEL.md`.
