<?php

namespace App\Services;

use App\Models\Product;

class ProductIdentifierService
{
    public function nextSequence(int $tenantId): int
    {
        return Product::withTrashed()
            ->where('tenant_id', $tenantId)
            ->count() + 1;
    }

    public function generateSku(int $tenantId, ?int $sequence = null): string
    {
        $seq = $sequence ?? $this->nextSequence($tenantId);

        return sprintf('SKU-%05d', $seq);
    }

    /**
     * Internal 13-digit numeric barcode (EAN-13 style with check digit).
     * Prefix 20 indicates internal / in-store use (not a GS1-registered code).
     */
    public function generateBarcode(int $tenantId, ?int $sequence = null): string
    {
        $seq = $sequence ?? $this->nextSequence($tenantId);
        $base = substr(sprintf('20%04d%07d', $tenantId % 10000, $seq % 10000000), 0, 12);

        return $base.$this->ean13CheckDigit($base);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function ensureIdentifiers(array $data, int $tenantId): array
    {
        $sequence = $this->nextSequence($tenantId);

        if (empty($data['sku'])) {
            $data['sku'] = $this->uniqueSku($tenantId, $sequence);
        }

        if (empty($data['barcode'])) {
            $data['barcode'] = $this->uniqueBarcode($tenantId, $sequence);
        }

        return $data;
    }

    /**
     * @return array{sku: string, barcode: string}
     */
    public function preview(int $tenantId): array
    {
        $sequence = $this->nextSequence($tenantId);

        return [
            'sku'     => $this->generateSku($tenantId, $sequence),
            'barcode' => $this->generateBarcode($tenantId, $sequence),
        ];
    }

    private function uniqueSku(int $tenantId, int $startSequence): string
    {
        $sequence = $startSequence;

        do {
            $sku = $this->generateSku($tenantId, $sequence);
            $sequence++;
        } while ($this->skuExists($tenantId, $sku));

        return $sku;
    }

    private function uniqueBarcode(int $tenantId, int $startSequence): string
    {
        $sequence = $startSequence;

        do {
            $barcode = $this->generateBarcode($tenantId, $sequence);
            $sequence++;
        } while ($this->barcodeExists($tenantId, $barcode));

        return $barcode;
    }

    private function skuExists(int $tenantId, string $sku): bool
    {
        return Product::withTrashed()
            ->where('tenant_id', $tenantId)
            ->where('sku', $sku)
            ->exists();
    }

    private function barcodeExists(int $tenantId, string $barcode): bool
    {
        return Product::withTrashed()
            ->where('tenant_id', $tenantId)
            ->where('barcode', $barcode)
            ->exists();
    }

    private function ean13CheckDigit(string $twelveDigits): string
    {
        $sum = 0;

        for ($i = 0; $i < 12; $i++) {
            $digit = (int) $twelveDigits[$i];
            $sum += $i % 2 === 0 ? $digit : $digit * 3;
        }

        return (string) ((10 - ($sum % 10)) % 10);
    }
}
