<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityLogController extends Controller
{
    public function export(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to'   => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $tenantId = $request->user()->tenant_id;
        $userIds = User::where('tenant_id', $tenantId)->pluck('id');

        $query = Activity::query()
            ->where('causer_type', User::class)
            ->whereIn('causer_id', $userIds)
            ->when(! empty($validated['from'] ?? null), fn ($q) => $q->whereDate('created_at', '>=', $validated['from']))
            ->when(! empty($validated['to'] ?? null), fn ($q) => $q->whereDate('created_at', '<=', $validated['to']))
            ->orderByDesc('created_at')
            ->limit(5000);

        $filename = 'activity-log-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['id', 'created_at', 'event', 'description', 'subject_type', 'subject_id', 'causer_id', 'properties']);

            $query->chunk(200, function ($rows) use ($out) {
                foreach ($rows as $row) {
                    fputcsv($out, [
                        $row->id,
                        $row->created_at?->toIso8601String(),
                        $row->event,
                        $row->description,
                        $row->subject_type,
                        $row->subject_id,
                        $row->causer_id,
                        json_encode($row->properties),
                    ]);
                }
            });

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
