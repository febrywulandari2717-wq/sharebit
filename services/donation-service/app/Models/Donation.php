<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Donation extends Model
{
    protected $table = 'donations';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id', 'request_id', 'food_id', 'donor_id', 'recipient_id', 'quantity',
        'pickup_time', 'pickup_location', 'instructions', 'status',
        'donor_confirmed_at', 'recipient_confirmed_at', 'cancel_reason', 'sync_pending',
    ];

    protected $casts = [
        'food_id' => 'integer',
        'donor_id' => 'integer',
        'recipient_id' => 'integer',
        'quantity' => 'integer',
        'pickup_time' => 'datetime',
        'donor_confirmed_at' => 'datetime',
        'recipient_confirmed_at' => 'datetime',
        'sync_pending' => 'boolean',
    ];

    private static function iso($value): ?string
    {
        return $value?->utc()->format('Y-m-d\TH:i:s\Z');
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'request_id' => $this->request_id,
            'food_id' => $this->food_id,
            'donor_id' => $this->donor_id,
            'recipient_id' => $this->recipient_id,
            'quantity' => $this->quantity,
            'pickup_time' => self::iso($this->pickup_time),
            'pickup_location' => $this->pickup_location,
            'instructions' => $this->instructions,
            'status' => $this->status,
            'donor_confirmed_at' => self::iso($this->donor_confirmed_at),
            'recipient_confirmed_at' => self::iso($this->recipient_confirmed_at),
            'cancel_reason' => $this->cancel_reason,
            'created_at' => self::iso($this->created_at),
        ];
    }
}
