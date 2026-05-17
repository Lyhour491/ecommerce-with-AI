# Admin Settings Update

Added a new Admin Settings page at `/admin/settings`.

## Frontend
- New page: `ecommerce-frontend/src/pages/admin/AdminSettings.jsx`
- Route added in `src/App.jsx`
- Sidebar Settings link already points to `/admin/settings`
- Styles added in `src/index.css`

## Backend
- Added `PUT /api/user/profile` to update admin name/email
- Added `PUT /api/user/password` to change admin password
- Updated `routes/api.php`
- Updated `app/Http/Controllers/Api/AuthController.php`

## Test
Frontend build passed with `npm run build`.
PHP syntax check passed for changed backend files.
