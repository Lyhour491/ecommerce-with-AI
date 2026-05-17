<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductImage;
use Illuminate\Support\Facades\Storage;

class ProductImageController extends Controller
{
    public function setPrimary(ProductImage $productImage)
    {
        ProductImage::where('product_id', $productImage->product_id)->update(['is_primary' => false]);
        $productImage->update(['is_primary' => true]);

        return response()->json([
            'message' => 'Primary image updated successfully.',
            'image' => $productImage->fresh(),
        ]);
    }

    public function destroy(ProductImage $productImage)
    {
        if ($productImage->image_path && !str_starts_with($productImage->image_path, 'http')) {
            Storage::disk('public')->delete($productImage->image_path);
        }

        $productId = $productImage->product_id;
        $wasPrimary = $productImage->is_primary;
        $productImage->delete();

        if ($wasPrimary) {
            $next = ProductImage::where('product_id', $productId)->orderBy('sort_order')->orderBy('id')->first();
            if ($next) {
                $next->update(['is_primary' => true]);
            }
        }

        return response()->json(['message' => 'Image deleted successfully.']);
    }
}
