<x-mail::message>
# Trial ending in {{ $daysLeft }} {{ str('day')->plural($daysLeft) }}

The trial for **{{ $tenant->name }}** ends on **{{ $tenant->trial_ends_at?->toFormattedDateString() }}**.

Upgrade from **Settings → Plan** to keep inventory, sales, and reports running without interruption.

<x-mail::button :url="rtrim(config('billing.callback_url', config('app.url')), '?billing=success')">
Upgrade plan
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
