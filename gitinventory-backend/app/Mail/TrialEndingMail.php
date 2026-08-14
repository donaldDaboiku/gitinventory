<?php

namespace App\Mail;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TrialEndingMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Tenant $tenant,
        public int $daysLeft,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your GITInventory trial ends soon',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.trial-ending',
        );
    }
}
