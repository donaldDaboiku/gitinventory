<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ProductImportService
{
    public function __construct(private ProductIdentifierService $identifiers) {}

    /**
     * @return array{imported: int, failed: int, errors: list<array{row: int, message: string}>}
     */
    public function import(User $user, string $csvContents): array
    {
        $tenantId = (int) $user->tenant_id;
        $settings = $user->tenant?->mergedSettings() ?? [];
        $rows = $this->parseCsv($csvContents);

        $imported = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2; // header is row 1

            try {
                $payload = $this->normalizeRow($row, $tenantId, $settings);
                $validator = Validator::make($payload, [
                    'name'            => ['required', 'string', 'max:255'],
                    'unit'            => ['required', 'string', Rule::in(['piece', 'kg', 'litre', 'box', 'pack', 'dozen', 'carton'])],
                    'cost_price'      => ['required', 'numeric', 'min:0'],
                    'selling_price'   => ['required', 'numeric', 'min:0'],
                    'quantity'        => ['required', 'integer', 'min:0'],
                    'sku'             => ['nullable', 'string', 'max:100', Rule::unique('products', 'sku')->where('tenant_id', $tenantId)],
                    'barcode'         => ['nullable', 'string', 'max:100', Rule::unique('products', 'barcode')->where('tenant_id', $tenantId)],
                    'min_stock_level' => ['nullable', 'integer', 'min:0'],
                    'tax_rate'        => ['nullable', 'numeric', 'min:0', 'max:100'],
                    'category_id'     => ['nullable', Rule::exists('categories', 'id')->where('tenant_id', $tenantId)],
                ]);

                if ($validator->fails()) {
                    $errors[] = ['row' => $rowNumber, 'message' => $validator->errors()->first()];
                    continue;
                }

                $validated = $this->identifiers->ensureIdentifiers($validator->validated(), $tenantId);

                DB::transaction(function () use ($validated, $tenantId, $user, $settings) {
                    $product = Product::create([
                        ...$validated,
                        'tenant_id'       => $tenantId,
                        'min_stock_level' => $validated['min_stock_level'] ?? ($settings['default_min_stock_level'] ?? 0),
                        'tax_rate'        => $validated['tax_rate'] ?? ($settings['default_tax_rate'] ?? 0),
                        'is_active'       => true,
                        'track_stock'     => true,
                    ]);

                    if (($validated['quantity'] ?? 0) > 0) {
                        StockMovement::create([
                            'tenant_id'       => $tenantId,
                            'product_id'      => $product->id,
                            'branch_id'       => $product->branch_id,
                            'user_id'         => $user->id,
                            'type'            => 'stock_in',
                            'quantity'        => $validated['quantity'],
                            'quantity_before' => 0,
                            'quantity_after'  => $validated['quantity'],
                            'reference_type'  => 'csv_import',
                            'note'            => 'Opening stock from CSV import',
                            'unit_cost'       => $validated['cost_price'],
                        ]);
                    }
                });

                $imported++;
            } catch (\Throwable $e) {
                $errors[] = ['row' => $rowNumber, 'message' => $e->getMessage()];
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

        $required = ['name', 'unit', 'cost_price', 'selling_price', 'quantity'];
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
     * @param  array<string, mixed>  $settings
     * @return array<string, mixed>
     */
    private function normalizeRow(array $row, int $tenantId, array $settings): array
    {
        $categoryId = null;
        $categoryName = $row['category'] ?? $row['category_name'] ?? '';
        if ($categoryName !== '') {
            $category = Category::firstOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'name'      => $categoryName,
                ],
                [
                    'is_active' => true,
                ]
            );
            $categoryId = $category->id;
        }

        return [
            'name'            => $row['name'] ?? '',
            'unit'            => strtolower($row['unit'] ?? 'piece'),
            'cost_price'      => $row['cost_price'] ?? '',
            'selling_price'   => $row['selling_price'] ?? '',
            'quantity'        => $row['quantity'] === '' ? 0 : $row['quantity'],
            'sku'             => ($row['sku'] ?? '') !== '' ? $row['sku'] : null,
            'barcode'         => ($row['barcode'] ?? '') !== '' ? $row['barcode'] : null,
            'min_stock_level' => ($row['min_stock_level'] ?? '') !== ''
                ? $row['min_stock_level']
                : ($settings['default_min_stock_level'] ?? 0),
            'tax_rate'        => ($row['tax_rate'] ?? '') !== ''
                ? $row['tax_rate']
                : ($settings['default_tax_rate'] ?? 0),
            'category_id'     => $categoryId,
        ];
    }
}
