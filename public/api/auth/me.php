<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('GET');
$user = ds_require_user();
ds_success(['user' => ds_user_dto($user)]);
