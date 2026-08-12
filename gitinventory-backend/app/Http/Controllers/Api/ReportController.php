<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function financial(Request $request): JsonResponse
    {
        [$dateFrom, $dateTo] = $this->resolveDateRange($request);

        return response()->json($this->buildFinancialReport($request->user()->tenant_id, $dateFrom, $dateTo));
    }

    public function exportFinancial(Request $request): StreamedResponse
    {
        [$dateFrom, $dateTo] = $this->resolveDateRange($request);
        $report = $this->buildFinancialReport($request->user()->tenant_id, $dateFrom, $dateTo);
        $filename = "financial-report-{$dateFrom}-to-{$dateTo}.csv";

        return response()->streamDownload(function () use ($report, $dateFrom, $dateTo) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['GITInventory Financial Report']);
            fputcsv($out, ['Period', "{$dateFrom} to {$dateTo}"]);
            fputcsv($out, []);
            fputcsv($out, ['Summary', 'Amount']);
            fputcsv($out, ['Revenue', $report['summary']['revenue']]);
            fputcsv($out, ['Cost of goods sold', $report['summary']['cost_of_goods_sold']]);
            fputcsv($out, ['Gross profit', $report['summary']['gross_profit']]);
            fputcsv($out, ['Purchases (inventory in)', $report['summary']['purchases_total']]);
            fputcsv($out, ['Receivables (outstanding)', $report['summary']['receivables']]);
            fputcsv($out, ['Payables (outstanding)', $report['summary']['payables']]);
            fputcsv($out, ['Stock valuation (at cost)', $report['summary']['stock_valuation']]);
            fputcsv($out, []);
            fputcsv($out, ['Daily breakdown']);
            fputcsv($out, ['Date', 'Sales count', 'Revenue', 'Gross profit']);
            foreach ($report['daily_breakdown'] as $row) {
                fputcsv($out, [$row['date'], $row['sales_count'], $row['revenue'], $row['gross_profit']]);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function exportFinancialPdf(Request $request): Response
    {
        [$dateFrom, $dateTo] = $this->resolveDateRange($request);
        $tenant = $request->user()->tenant;
        abort_unless($tenant, 404, 'Tenant not found.');

        $report = $this->buildFinancialReport($request->user()->tenant_id, $dateFrom, $dateTo);
        $filename = "financial-report-{$dateFrom}-to-{$dateTo}.pdf";

        return Pdf::loadView('pdf.financial-report', compact('report', 'tenant'))
            ->download($filename);
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function resolveDateRange(Request $request): array
    {
        $validated = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $dateFrom = $validated['date_from'] ?? now()->startOfMonth()->toDateString();
        $dateTo   = $validated['date_to'] ?? now()->toDateString();

        return [$dateFrom, $dateTo];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildFinancialReport(int $tenantId, string $dateFrom, string $dateTo): array
    {
        $salesQuery = fn () => Sale::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereDate('sale_date', '>=', $dateFrom)
            ->whereDate('sale_date', '<=', $dateTo);

        $revenue = (float) $salesQuery()->sum('total_amount');
        $salesCount = $salesQuery()->count();

        $cogs = (float) DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.tenant_id', $tenantId)
            ->where('sales.status', 'completed')
            ->whereDate('sales.sale_date', '>=', $dateFrom)
            ->whereDate('sales.sale_date', '<=', $dateTo)
            ->selectRaw('COALESCE(SUM(sale_items.cost_price * sale_items.quantity), 0) as total')
            ->value('total');

        $grossProfit = $revenue - $cogs;

        $purchasesTotal = (float) Purchase::where('tenant_id', $tenantId)
            ->where('status', 'received')
            ->whereDate('purchase_date', '>=', $dateFrom)
            ->whereDate('purchase_date', '<=', $dateTo)
            ->sum('total_amount');

        $purchasesCount = Purchase::where('tenant_id', $tenantId)
            ->where('status', 'received')
            ->whereDate('purchase_date', '>=', $dateFrom)
            ->whereDate('purchase_date', '<=', $dateTo)
            ->count();

        $receivables = (float) Sale::where('tenant_id', $tenantId)
            ->whereIn('payment_status', ['partial', 'pending'])
            ->sum('amount_due');

        $payables = (float) Purchase::where('tenant_id', $tenantId)
            ->whereIn('payment_status', ['partial', 'pending'])
            ->sum('amount_due');

        $stockValuation = (float) Product::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->selectRaw('COALESCE(SUM(quantity * cost_price), 0) as total')
            ->value('total');

        $dailyBreakdown = DB::table('sales')
            ->where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereDate('sale_date', '>=', $dateFrom)
            ->whereDate('sale_date', '<=', $dateTo)
            ->selectRaw('sale_date as date, COUNT(*) as sales_count, COALESCE(SUM(total_amount), 0) as revenue')
            ->groupBy('sale_date')
            ->orderBy('sale_date')
            ->get()
            ->map(function ($row) use ($tenantId) {
                $profit = (float) DB::table('sale_items')
                    ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                    ->where('sales.tenant_id', $tenantId)
                    ->where('sales.sale_date', $row->date)
                    ->where('sales.status', 'completed')
                    ->selectRaw('COALESCE(SUM((sale_items.unit_price - sale_items.cost_price) * sale_items.quantity), 0) as profit')
                    ->value('profit');

                return [
                    'date'         => $row->date,
                    'sales_count'  => (int) $row->sales_count,
                    'revenue'      => number_format((float) $row->revenue, 2, '.', ''),
                    'gross_profit' => number_format($profit, 2, '.', ''),
                ];
            })
            ->values()
            ->all();

        $fmt = fn (float $n) => number_format($n, 2, '.', '');

        return [
            'period' => [
                'date_from' => $dateFrom,
                'date_to'   => $dateTo,
            ],
            'summary' => [
                'revenue'            => $fmt($revenue),
                'cost_of_goods_sold' => $fmt($cogs),
                'gross_profit'       => $fmt($grossProfit),
                'gross_margin_pct'   => $revenue > 0 ? round(($grossProfit / $revenue) * 100, 1) : 0,
                'sales_count'        => $salesCount,
                'purchases_total'    => $fmt($purchasesTotal),
                'purchases_count'    => $purchasesCount,
                'receivables'        => $fmt($receivables),
                'payables'           => $fmt($payables),
                'stock_valuation'    => $fmt($stockValuation),
            ],
            'daily_breakdown' => $dailyBreakdown,
        ];
    }
}
