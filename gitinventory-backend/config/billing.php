<?php

return [

  'currency' => env('BILLING_CURRENCY', 'NGN'),

  'callback_url' => env('BILLING_CALLBACK_URL', env('FRONTEND_URL', 'http://localhost:5173').'/settings?billing=success'),

  'plans' => [
    'starter' => [
      'name' => 'Starter',
      'amount' => (int) env('BILLING_STARTER_AMOUNT', 1500000), // kobo (₦15,000)
      'interval_days' => 30,
      'description' => 'Core inventory, sales, and reports for one location.',
    ],
    'business' => [
      'name' => 'Business',
      'amount' => (int) env('BILLING_BUSINESS_AMOUNT', 3500000), // kobo (₦35,000)
      'interval_days' => 30,
      'description' => 'Everything in Starter plus team management and exports.',
    ],
  ],

];
