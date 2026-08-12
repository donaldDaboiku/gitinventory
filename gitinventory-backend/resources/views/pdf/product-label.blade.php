<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Label — {{ $product->name }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; margin: 0; padding: 12px; }
        .label { width: 240px; border: 1px dashed #999; padding: 10px; text-align: center; }
        .name { font-size: 13px; font-weight: bold; margin-bottom: 4px; }
        .price { font-size: 12px; margin-bottom: 8px; }
        .sku { font-size: 10px; color: #555; margin-top: 6px; }
        svg { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    <div class="label">
        <div class="name">{{ $product->name }}</div>
        <div class="price">{{ number_format((float) $product->selling_price, 2) }} {{ $tenant->currency }}</div>
        @if($barcodeSvg)
            {!! $barcodeSvg !!}
        @endif
        @if($product->sku)
            <div class="sku">SKU: {{ $product->sku }}</div>
        @endif
        @if($product->barcode)
            <div class="sku">{{ $product->barcode }}</div>
        @endif
    </div>
</body>
</html>
