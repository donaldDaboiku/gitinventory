<x-mail::message>
# Verify your email

Hi {{ $user->name }},

Please confirm this email address to unlock your GITInventory workspace.

<x-mail::button :url="$verifyUrl">
Verify email
</x-mail::button>

If you did not create an account, you can ignore this message.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
