<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        if (!class_exists(\Spatie\Permission\Models\Role::class) || !class_exists(\Spatie\Permission\Models\Permission::class)) {
            return;
        }

        $permissionMap = config('permissions.roles', []);
        $allPermissions = collect($permissionMap)
            ->flatten()
            ->reject(fn ($permission) => $permission === '*')
            ->unique()
            ->values();

        foreach ($allPermissions as $permission) {
            \Spatie\Permission\Models\Permission::findOrCreate($permission, 'web');
        }

        foreach ($permissionMap as $roleName => $permissions) {
            $role = \Spatie\Permission\Models\Role::findOrCreate($roleName, 'web');

            if (in_array('*', $permissions, true)) {
                $role->syncPermissions($allPermissions);
            } else {
                $role->syncPermissions($permissions);
            }
        }

        User::query()
            ->whereNotNull('role')
            ->get()
            ->each(function (User $user) use ($permissionMap) {
                if (array_key_exists($user->role, $permissionMap)) {
                    $user->syncRoles([$user->role]);
                }
            });
    }
}
