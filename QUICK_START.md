# 🚀 E-commerce with AI - Quick Start Guide

## **For New Devices (Docker Only - No Manual Setup)**

```bash
# 1. Clone the repository
git clone https://github.com/Lyhour491/ecommerce-with-AI.git
cd ecommerce-with-AI

# 2. Start all services (everything auto-initializes!)
docker-compose up -d

# 3. Wait ~2-3 minutes for services to be ready
docker-compose logs -f app

# Access the application:
- Backend API: http://localhost:8000
- Frontend App: http://localhost:5173
- phpMyAdmin: http://localhost:8080
- API Docs: http://localhost:8000/api/docs
```

✨ **That's it!** No migrations, no seeding, no manual fixes needed. The entrypoint script handles everything automatically.

---

## **Test Credentials**

After Docker initialization completes, use these to log in:

| Role | Email | Password |
|------|-------|----------|
| 👤 Admin | `admin@gmail.com` | `password` |
| 🛍️ Customer | `user@gmail.com` | `password` |
| 🏪 Seller | `seller@gmail.com` | `password` |

---

## **What the Entrypoint Script Does**

When the Laravel container starts, it automatically:

1. ✅ Waits for MySQL to be ready
2. ✅ Runs all database migrations (14 tables)
3. ✅ Seeds demo data (users, categories, products, orders)
4. ✅ Creates storage symlink
5. ✅ Starts PHP-FPM service

**No more `docker-compose up` then waiting to manually run:** 
```bash
php artisan migrate
php artisan db:seed
```

---

## **Services & Ports**

| Service | Port | URL |
|---------|------|-----|
| Laravel API | 8000 | http://localhost:8000 |
| React Frontend | 5173 | http://localhost:5173 |
| MySQL | 3307 | localhost:3307 |
| Redis | 6379 | localhost:6379 |
| phpMyAdmin | 8080 | http://localhost:8080 |

**phpMyAdmin credentials:**
- Host: `mysql`
- Username: `root`
- Password: `root`

---

## **Stopping & Cleaning Up**

```bash
# Stop all services
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v

# View logs
docker-compose logs -f
docker-compose logs app
docker-compose logs frontend
```

---

## **Troubleshooting**

### Containers won't start?
```bash
# Check logs
docker-compose logs --tail=100

# Rebuild everything
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Port already in use?
```bash
# Update docker-compose.yml to use different ports
# Example: Change "8000:80" to "8001:80"

# Or kill the process using the port
lsof -i :8000  # Find what's using port 8000
kill -9 <PID>  # Kill the process
```

### Frontend not connecting to backend?
Check the VITE_API_URL in docker-compose.yml matches your setup.

---

## **Development Notes**

- **Backend**: Laravel 13 with Sanctum auth
- **Frontend**: React 19 with Vite
- **Database**: MySQL 8.0
- **Queue**: Redis + Laravel Queue
- **Scheduler**: Runs via container scheduler service

---

## **Project Structure**

```
ecommerce-with-AI/
├── docker-compose.yml          # All services defined
├── ecommerce-backend/
│   ├── docker-entrypoint.sh    # ✨ Auto-initialization script
│   ├── docker/php.dockerfile    # PHP 8.4-FPM image
│   ├── app/                     # Laravel app code
│   ├── database/                # Migrations & seeders
│   └── routes/api.php           # API endpoints
└── ecommerce-frontend/
    ├── src/                     # React components
    └── package.json
```

---

## **Key Features**

✅ **Admin Dashboard** - Live stats, user management, seller approvals  
✅ **Seller Marketplace** - Product management, payouts, disputes  
✅ **Shopping Cart** - Full e-commerce flow  
✅ **AI Integration** - Gemini-powered recommendations & chatbot  
✅ **Notifications** - Real-time alerts  
✅ **Reviews & Ratings** - Product feedback  
✅ **Wishlist** - Save favorites  
✅ **API Documentation** - Swagger/OpenAPI  

---

## **Next Steps**

1. Wait for Docker build to complete
2. Access http://localhost:5173 in your browser
3. Log in with test credentials
4. Explore the app!

Questions? Check the README files in backend and frontend directories.
