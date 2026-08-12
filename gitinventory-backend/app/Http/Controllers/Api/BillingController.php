<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\PaystackService;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function __construct(
        private PaystackService $paystack,
        private SubscriptionService $subscriptions,
    ) {}

    public function plans(): JsonResponse
    {
        $plans = collect(config('billing.plans'))
            ->map(fn (array $plan, string $key) => [
                'id' => $key,
                'name' => $plan['name'],
                'amount' => $plan['amount'],
                'currency' => config('billing.currency', 'NGN'),
                'interval_days' => $plan['interval_days'],
                'description' => $plan['description'],
            ])
            ->values();

        return response()->json([
            'plans' => $plans,
            'paystack_public_key' => config('services.paystack.public_key'),
            'configured' => $this->paystack->isConfigured(),
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        abort_unless($tenant, 404, 'Tenant not found.');

        return response()->json([
            'billing' => $this->subscriptions->status($tenant),
        ]);
    }

    public function checkout(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        abort_unless($tenant, 404, 'Tenant not found.');

        $validated = $request->validate([
            'plan' => ['required', 'string', 'in:'.implode(',', array_keys(config('billing.plans')))],
        ]);

        $checkout = $this->paystack->initializeCheckout(
            $tenant,
            $validated['plan'],
            $request->user()->email,
        );

        return response()->json([
            'authorization_url' => $checkout['authorization_url'],
            'reference' => $checkout['reference'],
            'demo_mode' => ! $this->paystack->isConfigured(),
        ]);
    }

    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('x-paystack-signature');

        if (! $this->paystack->verifyWebhookSignature($payload, $signature)) {
            return response()->json(['message' => 'Invalid signature.'], 400);
        }

        $data = json_decode($payload, true);
        if (! is_array($data)) {
            return response()->json(['message' => 'Invalid payload.'], 400);
        }

        $payment = $this->paystack->extractSuccessfulPayment($data);
        if (! $payment) {
            return response()->json(['message' => 'Ignored event.']);
        }

        $tenant = Tenant::find($payment['tenant_id']);
        if (! $tenant) {
            return response()->json(['message' => 'Tenant not found.'], 404);
        }

        $this->subscriptions->activate($tenant, $payment['plan'], $payment['reference']);

        return response()->json(['message' => 'Subscription activated.']);
    }

    public function confirmDemo(Request $request): JsonResponse
    {
        if ($this->paystack->isConfigured()) {
            return response()->json(['message' => 'Demo confirmation is disabled when Paystack is configured.'], 403);
        }

        $tenant = $request->user()->tenant;
        abort_unless($tenant, 404, 'Tenant not found.');

        $validated = $request->validate([
            'plan' => ['required', 'string', 'in:'.implode(',', array_keys(config('billing.plans')))],
            'reference' => ['nullable', 'string', 'max:100'],
        ]);

        $this->subscriptions->activate($tenant, $validated['plan'], $validated['reference'] ?? null);

        return response()->json([
            'message' => 'Demo subscription activated.',
            'billing' => $this->subscriptions->status($tenant->fresh()),
        ]);
    }
}
