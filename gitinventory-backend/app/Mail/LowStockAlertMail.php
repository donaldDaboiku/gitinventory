<?php

namespace App\Mail;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class LowStockAlertMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param Collection<int, \App\Models\Product> $products
     */
    public function __construct(
        public Tenant $tenant,
        public Collection $products,
    ) {}

    public function envelope(): Envelope
    {
        $count = $this->products->count();

        return new Envelope(
            subject: "Low stock alert — {$count} item(s) need attention",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.low-stock-alert',
        );
    }
}
