<?php

namespace App\Console\Commands;

use App\Models\Donation;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class DonationsRemind extends Command
{
    protected $signature = 'donations:remind {--hours=24 : Kirim pengingat untuk pengambilan dalam N jam ke depan}';

    protected $description = 'Kirim notifikasi pengingat pengambilan (sekali per donasi).';

    public function handle(NotificationService $notifications): int
    {
        $due = Donation::where('status', 'scheduled')->whereNull('reminded_at')
            ->whereBetween('pickup_time', [now(), now()->addHours((int) $this->option('hours'))])->get();
        foreach ($due as $d) {
            foreach ([$d->donor_id, $d->recipient_id] as $uid) {
                $notifications->notify($uid, 'pickup_reminder', 'Pengingat pengambilan', 'Pengambilan di '.$d->pickup_location.' pada '.$d->pickup_time->timezone('Asia/Jakarta')->format('d M Y H:i').' WIB.', 'donations.html');
            }
            $d->reminded_at = now();
            $d->save();
        }
        $this->info("Pengingat terkirim untuk {$due->count()} donasi.");

        return self::SUCCESS;
    }
}
