<x-mail::message>
# Welcome to GITInventory, {{ $user->name }}

Your workspace **{{ $tenant->name }}** is ready.

Your **14-day trial** runs until **{{ $tenant->trial_ends_at?->toFormattedDateString() }}**. During the trial you can manage products, stock, sales, purchases, and reports from one desk.

<x-mail::button :url="config('app.url')">
Open GITInventory
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
