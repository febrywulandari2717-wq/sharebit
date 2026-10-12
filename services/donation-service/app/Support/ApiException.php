<?php

namespace App\Support;

use Illuminate\Http\Request;
use RuntimeException;

/** Error bisnis yang langsung dirender sebagai JSON error standar. */
class ApiException extends RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status = 400,
        public readonly ?array $details = null,
    ) {
        parent::__construct($message);
    }

    public function render(Request $request)
    {
        return ApiErrors::response($this->errorCode, $this->getMessage(), $this->status, $this->details);
    }

    public function report(): bool
    {
        return false;
    }
}
