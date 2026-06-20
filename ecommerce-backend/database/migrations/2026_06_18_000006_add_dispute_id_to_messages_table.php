<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->foreignId('dispute_id')
                ->nullable()
                ->after('order_id')
                ->constrained()
                ->nullOnDelete();
            $table->index(['dispute_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropForeign(['dispute_id']);
            $table->dropIndex(['dispute_id', 'created_at']);
            $table->dropColumn('dispute_id');
        });
    }
};
