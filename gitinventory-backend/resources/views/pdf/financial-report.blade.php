<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Financial Report</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .muted { color: #666; font-size: 11px; margin-bottom: 16px; }
        .grid { display: table; width: 100%; margin-bottom: 16px; }
        .card { display: table-cell; width: 25%; padding: 8px; border: 1px solid #ddd; }
        .card strong { display: block; font-size: 14px; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border-bottom: 1px solid #ddd; padding: 6px 4px; text-align: left; }
        th { font-size: 11px; text-transform: uppercase; color: #555; }
    </style>
</head>
<body>
    <h1>{{ $tenant->name }} — Financial Report</h1>
    <div class="muted">Period: {{ $report['period']['date_from'] }} to {{ $report['period']['date_to'] }}</div>

    <div class="grid">
        <div class="card"><span>Revenue</span><strong>{{ $report['summary']['revenue'] }}</strong></div>
        <div class="card"><span>Gross profit</span><strong>{{ $report['summary']['gross_profit'] }}</strong></div>
        <div class="card"><span>COGS</span><strong>{{ $report['summary']['cost_of_goods_sold'] }}</strong></div>
        <div class="card"><span>Purchases</span><strong>{{ $report['summary']['purchases_total'] }}</strong></div>
    </div>

    <div class="grid">
        <div class="card"><span>Receivables</span><strong>{{ $report['summary']['receivables'] }}</strong></div>
        <div class="card"><span>Payables</span><strong>{{ $report['summary']['payables'] }}</strong></div>
        <div class="card"><span>Stock value</span><strong>{{ $report['summary']['stock_valuation'] }}</strong></div>
        <div class="card"><span>Margin</span><strong>{{ $report['summary']['gross_margin_pct'] }}%</strong></div>
    </div>

    <h2 style="font-size: 14px;">Daily breakdown</h2>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Sales</th>
                <th>Revenue</th>
                <th>Gross profit</th>
            </tr>
        </thead>
        <tbody>
            @forelse($report['daily_breakdown'] as $row)
                <tr>
                    <td>{{ $row['date'] }}</td>
                    <td>{{ $row['sales_count'] }}</td>
                    <td>{{ $row['revenue'] }}</td>
                    <td>{{ $row['gross_profit'] }}</td>
                </tr>
            @empty
                <tr><td colspan="4">No sales in this period.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
