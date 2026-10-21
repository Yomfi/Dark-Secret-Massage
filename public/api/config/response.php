<?php
declare(strict_types=1);

function ds_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function ds_success(array $data, int $status = 200): void
{
    ds_json(['success' => true, 'data' => $data], $status);
}

function ds_error(int $status, string $code, string $message, $details = null): void
{
    $error = ['code' => $code, 'message' => $message];
    if ($details !== null) {
        $error['details'] = $details;
    }
    ds_json(['success' => false, 'error' => $error], $status);
}
