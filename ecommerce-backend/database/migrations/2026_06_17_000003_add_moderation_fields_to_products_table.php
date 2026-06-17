<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('moderation_status')->default('approved')->after('is_active');
            $table->boolean('moderation_is_fake')->default(false)->after('moderation_status');
            $table->boolean('moderation_is_illegal')->default(false)->after('moderation_is_fake');
            $table->text('moderation_reason')->nullable()->after('moderation_is_illegal');
            $table->timestamp('moderated_at')->nullable()->after('moderation_reason');
            $table->index('moderation_status');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['moderation_status']);
            $table->dropColumn([
                'moderation_status',
                'moderation_is_fake',
                'moderation_is_illegal',
                'moderation_reason',
                'moderated_at',
            ]);
        });
    }
};
