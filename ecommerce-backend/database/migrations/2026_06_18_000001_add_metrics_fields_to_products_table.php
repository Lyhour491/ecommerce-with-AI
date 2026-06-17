<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'views')) {
                $table->unsignedInteger('views')->default(0)->after('stock');
            }

            if (!Schema::hasColumn('products', 'sales_count')) {
                $table->unsignedInteger('sales_count')->default(0)->after('views');
            }

            if (!Schema::hasColumn('products', 'rating_avg')) {
                $table->decimal('rating_avg', 3, 2)->default(0)->after('sales_count');
            }

            if (!Schema::hasColumn('products', 'rating_count')) {
                $table->unsignedInteger('rating_count')->default(0)->after('rating_avg');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $columns = array_filter([
                Schema::hasColumn('products', 'views') ? 'views' : null,
                Schema::hasColumn('products', 'sales_count') ? 'sales_count' : null,
                Schema::hasColumn('products', 'rating_avg') ? 'rating_avg' : null,
                Schema::hasColumn('products', 'rating_count') ? 'rating_count' : null,
            ]);

            if ($columns) {
                $table->dropColumn($columns);
            }
        });
    }
};
