#!/bin/bash
set -e

echo "🚀 Starting Laravel setup..."

# Wait for database to be ready
echo "⏳ Waiting for MySQL..."
while ! nc -z ${DB_HOST:-mysql} ${DB_PORT:-3306}; do
  echo "  Database not ready yet, retrying..."
  sleep 2
done

echo "✅ Database is ready!"

# Generate app key if not exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  php artisan key:generate
fi

# Run migrations
echo "🔄 Running migrations..."
php artisan migrate --force

# Seed database
echo "🌱 Seeding database..."
php artisan db:seed --class=RolePermissionSeeder || true
php artisan db:seed --class=FullDemoSeeder

# Create storage link
echo "🔗 Creating storage symlink..."
php artisan storage:link || true

echo "✨ Laravel is ready! Starting PHP-FPM..."

# Start PHP-FPM in foreground
exec php-fpm
