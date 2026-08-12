<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class PaystackService
{
    public function isConfigured(): bool
    {
        return filled(config('services.paystack.secret_key'));
    }

    /**
     * @return array{authorization_url: string, reference: string}
     */
    public function initializeCheckout(Tenant $tenant, string $plan, string $email): array
    {
        $plans = config('billing.plans');
        abort_unless(isset($plans[$plan]), 422, 'Invalid plan selected.');

        $reference = sprintf('GITINV-%d-%s', $tenant->id, Str::lower(Str::random(12)));
        $amount = (int) $plans[$plan]['amount'];

        if (! $this->isConfigured()) {
            return [
                'authorization_url' => config('billing.callback_url').'&reference='.$reference.'&plan='.$plan.'&demo=1',
                'reference' => $reference,
            ];
        }

        $response = Http::withToken(config('services.paystack.secret_key'))
            ->acceptJson()
            ->post('https://api.paystack.co/transaction/initialize', [
                'email' => $email,
                'amount' => $amount,
                'currency' => config('billing.currency', 'NGN'),
                'reference' => $reference,
                'callback_url' => config('billing.callback_url'),
                'metadata' => [
                    'tenant_id' => $tenant->id,
                    'plan' => $plan,
                ],
            ]);

        if (! $response->successful() || ! data_get($response->json(), 'data.authorization_url')) {
            throw new \RuntimeException(data_get($response->json(), 'message', 'Could not start checkout.'));
        }

        return [
            'authorization_url' => (string) data_get($response->json(), 'data.authorization_url'),
            'reference' => (string) data_get($response->json(), 'data.reference', $reference),
        ];
    }

    public function verifyWebhookSignature(string $payload, ?string $signature): bool
    {
        if (! $this->isConfigured() || ! $signature) {
            return false;
        }

        $computed = hash_hmac('sha512', $payload, (string) config('services.paystack.secret_key'));

        return hash_equals($computed, $signature);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function extractSuccessfulPayment(array $payload): ?array
    {
        if (data_get($payload, 'event') !== 'charge.success') {
            return null;
        }

        $data = data_get($payload, 'data');
        if (! is_array($data) || data_get($data, 'status') !== 'success') {
            return null;
        }

        $metadata = data_get($data, 'metadata', []);
        $tenantId = is_array($metadata) ? ($metadata['tenant_id'] ?? null) : null;
        $plan = is_array($metadata) ? ($metadata['plan'] ?? null) : null;

        if (! $tenantId || ! $plan) {
            $reference = (string) data_get($data, 'reference', '');
            if (preg_match('/^GITINV-(\d+)-/', $reference, $matches)) {
                $tenantId = (int) $matches[1];
            }
        }

        if (! $tenantId) {
            return null;
        }

        return [
            'tenant_id' => (int) $tenantId,
            'plan' => (string) ($plan ?: 'starter'),
            'reference' => (string) data_get($data, 'reference', ''),
            'amount' => (int) data_get($data, 'amount', 0),
        ];
    }
}
