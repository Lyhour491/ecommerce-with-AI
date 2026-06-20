<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('disputes', function (Blueprint $table) {
            $table->foreignId('product_id')
                ->nullable()
                ->after('order_id')
                ->constrained()
                ->nullOnDelete();
            $table->boolean('seller_requested_refund')->default(false)->after('status');
            $table->timestamp('seller_refund_requested_at')->nullable()->after('seller_requested_refund');
        });
    }

    public function down(): void
    {
        Schema::table('disputes', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropColumn(['product_id', 'seller_requested_refund', 'seller_refund_requested_at']);
        });
    }
};
