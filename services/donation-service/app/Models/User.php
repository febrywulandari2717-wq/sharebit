<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    protected $table = 'users';

    protected $fillable = ['name', 'email', 'password_hash', 'role', 'phone', 'address', 'is_active', 'notify_enabled', 'leaderboard_visible'];

    protected $hidden = ['password_hash'];

    protected $casts = [
        'is_active' => 'boolean',
        'notify_enabled' => 'boolean',
        'leaderboard_visible' => 'boolean',
    ];

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'phone' => $this->phone,
            'address' => $this->address,
            'is_active' => $this->is_active,
            'notify_enabled' => (bool) ($this->notify_enabled ?? true),
            'leaderboard_visible' => (bool) ($this->leaderboard_visible ?? true),
            'created_at' => $this->created_at?->utc()->format('Y-m-d\TH:i:s\Z'),
        ];
    }
}
