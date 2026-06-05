<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('shop_name')->nullable()->after('role');
            $table->text('shop_description')->nullable()->after('shop_name');
            $table->string('shop_category')->nullable()->after('shop_description');
            $table->string('tax_id')->nullable()->after('shop_category');
            $table->string('website')->nullable()->after('tax_id');
            $table->string('business_phone')->nullable()->after('website');
            $table->string('business_address')->nullable()->after('business_phone');
            $table->string('business_city')->nullable()->after('business_address');
            $table->string('business_state')->nullable()->after('business_city');
            $table->string('business_zip')->nullable()->after('business_state');
            $table->string('business_country')->nullable()->after('business_zip');
            $table->string('seller_status')->nullable()->after('business_country'); // null, 'pending', 'approved', 'rejected'
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'shop_name', 
                'shop_description', 
                'shop_category', 
                'tax_id', 
                'website', 
                'business_phone', 
                'business_address', 
                'business_city', 
                'business_state', 
                'business_zip', 
                'business_country', 
                'seller_status'
            ]);
        });
    }
};
