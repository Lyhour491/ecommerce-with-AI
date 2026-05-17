<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    private function requireAdmin(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin') {
            abort(response()->json(['message' => 'Admin access required'], 403));
        }
    }

    public function index(Request $request)
    {
        $this->requireAdmin($request);

        return response()->json([
            'users' => User::withCount('orders')->latest()->get(),
        ]);
    }

    public function update(Request $request, User $user)
    {
        $this->requireAdmin($request);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($user->id)],
            'role' => 'sometimes|required|in:admin,customer',
            'password' => 'sometimes|nullable|string|min:6',
        ]);

        if (array_key_exists('password', $data)) {
            if ($data['password']) {
                $data['password'] = Hash::make($data['password']);
            } else {
                unset($data['password']);
            }
        }

        $user->update($data);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->fresh()->loadCount('orders'),
        ]);
    }

    public function updateRole(Request $request, User $user)
    {
        $this->requireAdmin($request);

        $data = $request->validate([
            'role' => 'required|in:admin,customer',
        ]);

        $user->update(['role' => $data['role']]);

        return response()->json([
            'message' => 'User role updated successfully',
            'user' => $user->fresh()->loadCount('orders'),
        ]);
    }
}
