<x-mail::message>
# Low stock alert for {{ $tenant->name }}

The following products are at or below their minimum stock level:

@foreach ($products as $product)
- **{{ $product->name }}** — {{ $product->quantity }} {{ $product->unit }} left (min {{ $product->min_stock_level }})
@endforeach

Review stock levels and record purchases or stock in as needed.

<x-mail::button :url="config('app.frontend_url')">
Open GITInventory
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
