<?php
declare(strict_types=1);

require_once __DIR__ . '/config/bootstrap.php';

ds_require_method('GET');
ds_success([
    'status' => 'ok',
    'service' => 'massager-studio-api',
    // Bumped by hand each release so a live response proves which code is
    // actually serving, independently of the frontend asset hash.
    'release' => '2026-11-02.5',
]);
