<x-mail::message>
# Reset your password

Hi {{ $user->name }},

We received a request to reset the password for your GITInventory account.

<x-mail::button :url="$resetUrl">
Choose a new password
</x-mail::button>

This link expires in {{ config('auth.passwords.users.expire') }} minutes. If you did not request a reset, you can ignore this email.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
