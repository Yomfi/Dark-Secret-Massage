<?php
declare(strict_types=1);

require_once __DIR__ . '/config/bootstrap.php';

ds_require_method('GET');
ds_success([
    'status' => 'ok',
    'service' => 'dark-secret-api',
]);
