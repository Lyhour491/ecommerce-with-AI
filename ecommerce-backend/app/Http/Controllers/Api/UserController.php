<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;

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
            'role' => 'sometimes|required|in:admin,seller,customer',
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
            'role' => 'required|in:admin,seller,customer',
        ]);

        $user->update(['role' => $data['role']]);

        return response()->json([
            'message' => 'User role updated successfully',
            'user' => $user->fresh()->loadCount('orders'),
        ]);
    }

    public function applySeller(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'shop_name' => 'required|string|max:255',
            'shop_description' => 'required|string',
            'shop_category' => 'required|string|max:255',
            'tax_id' => 'required|string|max:255',
            'website' => 'nullable|string|max:255',
            'business_phone' => 'required|string|max:255',
            'business_address' => 'required|string|max:255',
            'business_city' => 'required|string|max:255',
            'business_state' => 'required|string|max:255',
            'business_zip' => 'required|string|max:255',
            'business_country' => 'required|string|max:255',
        ]);

        $user->update(array_merge($data, ['seller_status' => 'pending']));

        return response()->json([
            'message' => 'Seller application submitted successfully',
            'user' => $user->fresh(),
        ]);
    }

    public function getSellerApplications(Request $request)
    {
        $this->requireAdmin($request);

        return response()->json([
            'users' => User::where('seller_status', 'pending')->latest()->get(),
        ]);
    }

    public function approveSeller(Request $request, User $user)
    {
        $this->requireAdmin($request);

        $user->update([
            'role' => 'seller',
            'seller_status' => 'approved',
        ]);

        return response()->json([
            'message' => 'Seller application approved successfully',
            'user' => $user->fresh()->loadCount('orders'),
        ]);
    }

    public function rejectSeller(Request $request, User $user)
    {
        $this->requireAdmin($request);

        $user->update([
            'seller_status' => 'rejected',
        ]);

        return response()->json([
            'message' => 'Seller application rejected successfully',
            'user' => $user->fresh()->loadCount('orders'),
        ]);
    }

    public function banSeller(Request $request, User $user)
    {
        $this->requireAdmin($request);

        if ($user->role === 'admin') {
            return response()->json([
                'message' => 'Admin accounts cannot be banned as sellers.',
            ], 422);
        }

        $user->update([
            'role' => 'customer',
            'seller_status' => 'rejected',
        ]);

        $disabledProducts = Product::where('user_id', $user->id)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        Cache::forget('products:top');

        return response()->json([
            'message' => "Seller banned and {$disabledProducts} active product(s) archived.",
            'user' => $user->fresh()->loadCount('orders'),
            'disabled_products' => $disabledProducts,
        ]);
    }
}
