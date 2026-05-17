#!/bin/sh
# Run this once after `docker-compose up -d` to initialise the database
docker exec ecommerce_app php artisan migrate --force
docker exec ecommerce_app php artisan db:seed --force
