<?php

namespace App\Console\Commands;

use App\Models\Donation;
use App\Services\RequestServiceClient;
use Illuminate\Console\Command;

class DonationsSync extends Command
{
    protected $signature = 'donations:sync';

    protected $description = 'Kirim ulang status donasi (sync_pending) ke Request Service.';

    public function handle(RequestServiceClient $client): int
    {
        $pending = Donation::where('sync_pending', true)->get();
        $this->info("Donasi menunggu sinkronisasi: {$pending->count()}");

        foreach ($pending as $d) {
            // Request Service hanya menerima urutan approved -> scheduled -> completed
            $steps = match ($d->status) {
                'completed' => ['scheduled', 'completed'],
                'cancelled' => ['cancelled'],
                default => ['scheduled'],
            };
            $ok = true;
            foreach ($steps as $step) {
                $ok = $client->updateStatus($d->request_id, $step, $d->cancel_reason) && $ok;
            }
            if ($ok) {
                $d->sync_pending = false;
                $d->save();
                $this->info("OK   {$d->id}");
            } else {
                $this->warn("GAGAL {$d->id}");
            }
        }

        return self::SUCCESS;
    }
}
