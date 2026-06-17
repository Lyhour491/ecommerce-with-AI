<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NotificationCenterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request, NotificationCenterService $notifications): JsonResponse
    {
        return response()->json($notifications->forUser($request->user()));
    }

    public function markAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $id = $request->route('notification');

        if ($id === 'all') {
            $user->unreadNotifications()->update(['read_at' => now()]);
        } else {
            $notification = $user->notifications()->where('id', $id)->firstOrFail();
            $notification->markAsRead();
        }

        return response()->json(['message' => 'Notification marked as read']);
    }
}
