# Laravel CORS fix

If the browser says `No Access-Control-Allow-Origin header`, fix it in the Laravel backend, not React.

Open `config/cors.php` and use this during local development:

```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['http://localhost:5173', 'http://127.0.0.1:5173'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
```

Then run:

```bash
php artisan config:clear
php artisan cache:clear
php artisan serve
```

If your backend does not have `config/cors.php`, publish/add CORS support or install Laravel's CORS middleware depending on your Laravel version.
