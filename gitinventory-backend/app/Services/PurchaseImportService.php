<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class PurchaseImportService
{
    /**
     * @return array{imported: int, failed: int, errors: list<array{row: int, message: string}>}
     */
    public function import(User $user, string $csvContents): array
    {
        $tenantId = (int) $user->tenant_id;
        $rows = $this->parseCsv($csvContents);

        $imported = 0;
        $errors = [];

        // Group rows by supplier so each supplier gets one Purchase record
        $grouped = [];
        foreach ($rows as $index => $row) {
            $supplierKey = strtolower(trim($row['supplier'] ?? ''));
            $grouped[$supplierKey][] = ['index' => $index, 'row' => $row];
        }

        foreach ($grouped as $entries) {
            $supplierName = trim($entries[0]['row']['supplier'] ?? '');
            $supplierId = null;

            if ($supplierName !== '') {
                $supplier = Supplier::firstOrCreate(
                    ['tenant_id' => $tenantId, 'name' => $supplierName],
                    ['is_active' => true],
                );
                $supplierId = $supplier->id;
            }

            $validItems = [];

            foreach ($entries as $entry) {
                $rowNumber = $entry['index'] + 2; // header is row 1
                $row = $entry['row'];

                $payload = $this->normalizeRow($row, $tenantId);
                $validator = Validator::make($payload, [
                    'product_id'    => ['required', Rule::exists('products', 'id')->where('tenant_id', $tenantId)],
                    'quantity'      => ['required', 'integer', 'min:1'],
                    'unit_cost'     => ['required', 'numeric', 'min:0'],
                ]);

                if ($validator->fails()) {
                    $errors[] = ['row' => $rowNumber, 'message' => $validator->errors()->first()];
                    continue;
                }

                $validItems[] = ['rowNumber' => $rowNumber, 'data' => $validator->validated()];
            }

            if ($validItems === []) {
                continue;
            }

            try {
                DB::transaction(function () use ($validItems, $tenantId, $user, $supplierId) {
                    $total = 0;
                    foreach ($validItems as $item) {
                        $total += $item['data']['unit_cost'] * $item['data']['quantity'];
                    }

                    $purchase = Purchase::create([
                        'tenant_id'        => $tenantId,
                        'supplier_id'      => $supplierId,
                        'user_id'          => $user->id,
                        'purchase_date'    => now()->toDateString(),
                        'total_amount'     => $total,
                        'amount_paid'      => 0,
                        'amount_due'       => $total,
                        'payment_status'   => 'pending',
                        'status'           => 'received',
                        'notes'            => 'CSV import',
                    ]);

                    foreach ($validItems as $item) {
                        $d = $item['data'];
                        PurchaseItem::create([
                            'purchase_id'       => $purchase->id,
                            'product_id'        => $d['product_id'],
                            'quantity_ordered'   => $d['quantity'],
                            'quantity_received'  => $d['quantity'],
                            'unit_cost'          => $d['unit_cost'],
                            'subtotal'           => $d['unit_cost'] * $d['quantity'],
                        ]);

                        $product = Product::where('tenant_id', $tenantId)
                            ->lockForUpdate()
                            ->findOrFail($d['product_id']);
                        $before = $product->quantity;
                        $product->increment('quantity', $d['quantity']);

                        StockMovement::create([
                            'tenant_id'       => $tenantId,
                            'product_id'      => $product->id,
                            'branch_id'       => $product->branch_id,
                            'user_id'         => $user->id,
                            'type'            => 'stock_in',
                            'quantity'        => $d['quantity'],
                            'quantity_before'  => $before,
                            'quantity_after'   => $before + $d['quantity'],
                            'reference_type'   => 'purchase',
                            'reference_id'     => $purchase->id,
                            'unit_cost'        => $d['unit_cost'],
                            'note'             => 'CSV purchase import',
                        ]);

                        $product->update(['cost_price' => $d['unit_cost']]);
                    }
                });

                $imported += count($validItems);
            } catch (\Throwable $e) {
                foreach ($validItems as $item) {
                    $errors[] = ['row' => $item['rowNumber'], 'message' => $e->getMessage()];
                }
            }
        }

        return [
            'imported' => $imported,
            'failed'   => count($errors),
            'errors'   => array_slice($errors, 0, 25),
        ];
    }

    /**
     * @return list<array<string, string>>
     */
    private function parseCsv(string $contents): array
    {
        $lines = preg_split('/\r\n|\r|\n/', trim($contents)) ?: [];
        if ($lines === [] || trim($lines[0]) === '') {
            throw new \InvalidArgumentException('CSV file is empty.');
        }

        $header = str_getcsv(array_shift($lines));
        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $header);

        $required = ['product_id', 'quantity', 'unit_cost'];
        foreach ($required as $column) {
            if (! in_array($column, $header, true)) {
                throw new \InvalidArgumentException("Missing required CSV column: {$column}");
            }
        }

        if (count($lines) > 200) {
            throw new \InvalidArgumentException('CSV import is limited to 200 rows per upload.');
        }

        $rows = [];
        foreach ($lines as $line) {
            if (trim($line) === '') {
                continue;
            }
            $values = str_getcsv($line);
            $row = [];
            foreach ($header as $i => $key) {
                $row[$key] = trim((string) ($values[$i] ?? ''));
            }
            $rows[] = $row;
        }

        if ($rows === []) {
            throw new \InvalidArgumentException('CSV has a header but no data rows.');
        }

        return $rows;
    }

    /**
     * @param  array<string, string>  $row
     * @return array<string, mixed>
     */
    private function normalizeRow(array $row, int $tenantId): array
    {
        $productId = $row['product_id'] ?? '';

        // Allow lookup by SKU or barcode instead of numeric ID
        if ($productId !== '' && ! is_numeric($productId)) {
            $product = Product::where('tenant_id', $tenantId)
                ->where(fn ($q) => $q->where('sku', $productId)->orWhere('barcode', $productId))
                ->first();
            $productId = $product?->id ?? $productId;
        }

        return [
            'product_id' => $productId,
            'quantity'   => ($row['quantity'] ?? '') !== '' ? (int) $row['quantity'] : 0,
            'unit_cost'  => $row['unit_cost'] ?? '',
        ];
    }
}
