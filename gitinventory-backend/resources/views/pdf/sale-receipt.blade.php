<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt {{ $sale->invoice_number }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .muted { color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border-bottom: 1px solid #ddd; padding: 6px 4px; text-align: left; }
        th { font-size: 11px; text-transform: uppercase; color: #555; }
        .totals { margin-top: 12px; width: 45%; margin-left: auto; }
        .totals td { border: none; padding: 4px 0; }
        .totals .grand td { font-weight: bold; border-top: 1px solid #111; padding-top: 8px; }
        .header { margin-bottom: 18px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $tenant->name }}</h1>
        <div class="muted">
            @if($tenant->address) {{ $tenant->address }}<br>@endif
            @if($tenant->phone) {{ $tenant->phone }} · @endif
            {{ $tenant->email }}
        </div>
    </div>

    <div>
        <strong>Invoice:</strong> {{ $sale->invoice_number }}<br>
        <strong>Date:</strong> {{ $sale->sale_date }}<br>
        <strong>Customer:</strong> {{ $sale->customer?->name ?? 'Walk-in' }}<br>
        <strong>Payment:</strong> {{ ucfirst($sale->payment_method) }} ({{ ucfirst($sale->payment_status) }})
    </div>

    <table>
        <thead>
            <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Subtotal</th>
            </tr>
        </thead>
        <tbody>
            @foreach($sale->items as $item)
                <tr>
                    <td>{{ $item->product?->name ?? 'Item' }}</td>
                    <td>{{ $item->quantity }}</td>
                    <td>{{ number_format((float) $item->unit_price, 2) }}</td>
                    <td>{{ number_format((float) $item->subtotal, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr><td>Subtotal</td><td align="right">{{ number_format((float) $sale->subtotal, 2) }}</td></tr>
        @if((float) $sale->discount_amount > 0)
            <tr><td>Discount</td><td align="right">-{{ number_format((float) $sale->discount_amount, 2) }}</td></tr>
        @endif
        @if((float) $sale->tax_amount > 0)
            <tr><td>Tax</td><td align="right">{{ number_format((float) $sale->tax_amount, 2) }}</td></tr>
        @endif
        <tr class="grand"><td>Total</td><td align="right">{{ number_format((float) $sale->total_amount, 2) }} {{ $tenant->currency }}</td></tr>
        <tr><td>Paid</td><td align="right">{{ number_format((float) $sale->amount_paid, 2) }}</td></tr>
        @if((float) $sale->amount_due > 0)
            <tr><td>Due</td><td align="right">{{ number_format((float) $sale->amount_due, 2) }}</td></tr>
        @endif
    </table>

    @if($sale->notes)
        <p class="muted" style="margin-top: 16px;">Notes: {{ $sale->notes }}</p>
    @endif
</body>
</html>
