<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SystemSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'updated_by',
    ];

    protected $casts = [
        'value' => 'array',
    ];

    public static function defaults(): array
    {
        return [
            'platform' => [
                'platform_name' => 'MarketAI',
                'support_email' => 'support@marketai.com',
                'commission_rate' => 10,
                'currency' => 'USD',
                'minimum_order_amount' => 5,
                'maximum_order_amount' => 10000,
            ],
            'payments' => [
                'payout_schedule' => 'weekly',
                'minimum_payout_amount' => 50,
                'payout_processing_days' => 3,
                'gateways' => [
                    'stripe' => true,
                    'paypal' => true,
                ],
            ],
            'email' => [
                'smtp_server' => 'smtp.marketai.com',
                'smtp_port' => 587,
                'smtp_username' => 'noreply@marketai.com',
                'from_email_address' => 'MarketAI <noreply@marketai.com>',
                'order_emails' => true,
                'marketing_emails' => false,
            ],
            'security' => [
                'require_2fa' => false,
                'session_timeout_minutes' => 30,
                'max_login_attempts' => 5,
                'minimum_password_length' => 8,
                'require_strong_passwords' => true,
            ],
            'alerts' => [
                'new_order' => true,
                'new_seller' => true,
                'dispute' => true,
                'payout' => true,
                'system_alerts' => true,
            ],
        ];
    }

    public static function allMerged(): array
    {
        $settings = self::defaults();

        self::query()
            ->whereIn('key', array_keys($settings))
            ->get()
            ->each(function (SystemSetting $setting) use (&$settings) {
                if (is_array($setting->value)) {
                    $settings[$setting->key] = array_replace_recursive(
                        $settings[$setting->key] ?? [],
                        $setting->value
                    );
                }
            });

        return $settings;
    }

    public static function getValue(string $path, mixed $fallback = null): mixed
    {
        $segments = explode('.', $path);
        $value = self::allMerged();

        foreach ($segments as $segment) {
            if (!is_array($value) || !array_key_exists($segment, $value)) {
                return $fallback;
            }

            $value = $value[$segment];
        }

        return $value;
    }
}
