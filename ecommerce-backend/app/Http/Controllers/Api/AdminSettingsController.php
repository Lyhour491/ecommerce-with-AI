<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AdminSettingsController extends Controller
{
    public function index()
    {
        return response()->json([
            'settings' => SystemSetting::allMerged(),
        ]);
    }

    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), $this->rules());

        $validator->after(function ($validator) use ($request) {
            $minimum = (float) $request->input('platform.minimum_order_amount', 0);
            $maximum = (float) $request->input('platform.maximum_order_amount', 0);

            if ($maximum < $minimum) {
                $validator->errors()->add(
                    'platform.maximum_order_amount',
                    'The maximum order amount must be greater than or equal to the minimum order amount.'
                );
            }
        });

        $validated = $validator->validate();
        $settings = array_replace_recursive(SystemSetting::defaults(), $validated);

        foreach ($settings as $key => $value) {
            SystemSetting::updateOrCreate(
                ['key' => $key],
                [
                    'value' => $value,
                    'updated_by' => $request->user()?->id,
                ]
            );
        }

        return response()->json([
            'message' => 'System settings saved successfully.',
            'settings' => SystemSetting::allMerged(),
        ]);
    }

    public function reset(Request $request)
    {
        SystemSetting::query()
            ->whereIn('key', array_keys(SystemSetting::defaults()))
            ->delete();

        return response()->json([
            'message' => 'System settings reset to defaults.',
            'settings' => SystemSetting::allMerged(),
        ]);
    }

    private function rules(): array
    {
        return [
            'platform' => ['required', 'array'],
            'platform.platform_name' => ['required', 'string', 'max:120'],
            'platform.support_email' => ['required', 'email', 'max:160'],
            'platform.commission_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'platform.currency' => ['required', Rule::in(['USD', 'KHR', 'EUR', 'THB'])],
            'platform.minimum_order_amount' => ['required', 'numeric', 'min:0'],
            'platform.maximum_order_amount' => ['required', 'numeric', 'min:0'],

            'payments' => ['required', 'array'],
            'payments.payout_schedule' => ['required', Rule::in(['daily', 'weekly', 'biweekly', 'monthly'])],
            'payments.minimum_payout_amount' => ['required', 'numeric', 'min:0'],
            'payments.payout_processing_days' => ['required', 'integer', 'min:0', 'max:60'],
            'payments.gateways' => ['required', 'array'],
            'payments.gateways.stripe' => ['required', 'boolean'],
            'payments.gateways.paypal' => ['required', 'boolean'],

            'email' => ['required', 'array'],
            'email.smtp_server' => ['nullable', 'string', 'max:160'],
            'email.smtp_port' => ['required', 'integer', 'min:1', 'max:65535'],
            'email.smtp_username' => ['nullable', 'string', 'max:160'],
            'email.from_email_address' => ['required', 'string', 'max:220'],
            'email.order_emails' => ['required', 'boolean'],
            'email.marketing_emails' => ['required', 'boolean'],

            'security' => ['required', 'array'],
            'security.require_2fa' => ['required', 'boolean'],
            'security.session_timeout_minutes' => ['required', 'integer', 'min:5', 'max:1440'],
            'security.max_login_attempts' => ['required', 'integer', 'min:1', 'max:20'],
            'security.minimum_password_length' => ['required', 'integer', 'min:6', 'max:128'],
            'security.require_strong_passwords' => ['required', 'boolean'],

            'alerts' => ['required', 'array'],
            'alerts.new_order' => ['required', 'boolean'],
            'alerts.new_seller' => ['required', 'boolean'],
            'alerts.dispute' => ['required', 'boolean'],
            'alerts.payout' => ['required', 'boolean'],
            'alerts.system_alerts' => ['required', 'boolean'],
        ];
    }
}
