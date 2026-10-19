<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CampaignParticipant extends Model
{
    protected $table = 'campaign_participants';

    public $timestamps = false;

    protected $guarded = [];
}
