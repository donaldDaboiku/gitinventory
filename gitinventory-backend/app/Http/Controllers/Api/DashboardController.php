<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public static function cacheKey(int $tenantId): string
    {
        return 'dashboard:'.$tenantId.':'.now()->toDateString();
    }

    public function __invoke(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenant_id;

        // ponytail: 60s TTL, no event invalidation — bump TTL or forget cacheKey() after sales/stock if dashboards go stale
        $payload = Cache::remember(self::cacheKey($tenantId), 60, fn () => $this->metrics($tenantId));

        return response()->json($payload);
    }

    /**
     * @return array<string, mixed>
     */
    private function metrics(int $tenantId): array
    {
        $today = now()->toDateString();
        $month = now()->startOfMonth()->toDateString();

        $totalProducts = Product::where('tenant_id', $tenantId)->where('is_active', true)->count();
        $lowStockCount = Product::where('tenant_id', $tenantId)->whereColumn('quantity', '<=', 'min_stock_level')->count();
        $expiringSoon = Product::where('tenant_id', $tenantId)
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<=', now()->addDays(30))
            ->where('expiry_date', '>=', now())
            ->count();

        $todaySales = Sale::where('tenant_id', $tenantId)
            ->where('sale_date', $today)
            ->where('status', 'completed')
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue')
            ->first();

        $monthSales = Sale::where('tenant_id', $tenantId)
            ->where('sale_date', '>=', $month)
            ->where('status', 'completed')
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue, COALESCE(SUM(total_amount - discount_amount), 0) as net')
            ->first();

        $monthProfit = DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.sale_date', '>=', $month)
            ->where('sales.status', 'completed')
            ->selectRaw('COALESCE(SUM((sale_items.unit_price - sale_items.cost_price) * sale_items.quantity), 0) as profit')
            ->value('profit');

        $pendingReceivables = Sale::where('tenant_id', $tenantId)
            ->where(fn ($q) => $q->where('payment_status', 'partial')
                ->orWhere('payment_status', 'pending'))
            ->sum('amount_due');

        $salesChart = Sale::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->where('sale_date', '>=', now()->subDays(6)->toDateString())
            ->selectRaw('sale_date, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue')
            ->groupBy('sale_date')
            ->orderBy('sale_date')
            ->get();

        $topProducts = DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.sale_date', '>=', $month)
            ->where('sales.status', 'completed')
            ->selectRaw('products.name, SUM(sale_items.quantity) as total_qty, SUM(sale_items.subtotal) as total_revenue')
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_qty')
            ->limit(5)
            ->get();

        return [
            'metrics' => [
                'total_products'      => $totalProducts,
                'low_stock_count'     => $lowStockCount,
                'expiring_soon'       => $expiringSoon,
                'pending_receivables' => number_format((float) $pendingReceivables, 2, '.', ''),
                'today' => [
                    'sales_count' => $todaySales->count ?? 0,
                    'revenue'     => number_format((float) ($todaySales->revenue ?? 0), 2, '.', ''),
                ],
                'this_month' => [
                    'sales_count' => $monthSales->count ?? 0,
                    'revenue'     => number_format((float) ($monthSales->revenue ?? 0), 2, '.', ''),
                    'profit'      => number_format((float) $monthProfit, 2, '.', ''),
                ],
            ],
            'charts' => [
                'sales_last_7_days' => $salesChart,
                'top_products'      => $topProducts,
            ],
        ];
    }
}
