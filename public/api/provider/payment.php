<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

$user = ds_require_provider();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if (!ds_table_exists('provider_verification_payments') || !ds_table_exists('provider_verification')) {
    ds_error(503, 'NOT_CONFIGURED', 'Payment tables are not installed. Run the SQL migration.');
}

$verification = ds_ensure_provider_verification($user['id']);

if ($method === 'GET') {
    ds_require_method('GET');
    $stmt = ds_pdo()->prepare(
        'SELECT * FROM provider_verification_payments WHERE provider_user_id = ? ORDER BY created_at DESC LIMIT 1'
    );
    $stmt->execute([$user['id']]);
    $payment = $stmt->fetch() ?: null;

    ds_success([
        'feeAmount' => 100.0,
        'currency' => 'GHS',
        'paymentStatus' => $verification['payment_status'] ?? 'unpaid',
        'gatewayReady' => false,
        'message' => 'Verification payment integration coming soon',
        'latestPayment' => $payment ? [
            'id' => $payment['id'],
            'status' => $payment['status'],
            'amount' => (float) $payment['amount'],
            'currency' => $payment['currency'],
            'gateway' => $payment['gateway'],
        ] : null,
    ]);
}

ds_require_method('POST');
ds_rate_limit('provider_payment', 10, 15 * 60);

// Do not fake successful payments. Record intent only.
$now = ds_now_sql();
$pdo = ds_pdo();
$paymentId = ds_new_id();

$pdo->prepare(
    'INSERT INTO provider_verification_payments
     (id, provider_user_id, amount, currency, status, gateway, created_at, updated_at)
     VALUES (?, ?, 100.00, \'GHS\', \'unpaid\', \'paystack_pending\', ?, ?)'
)->execute([$paymentId, $user['id'], $now, $now]);

$pdo->prepare(
    'UPDATE provider_verification SET payment_status = \'unpaid\', updated_at = ? WHERE provider_user_id = ?'
)->execute([$now, $user['id']]);

ds_success([
    'initiated' => false,
    'gatewayReady' => false,
    'paymentId' => $paymentId,
    'feeAmount' => 100.0,
    'currency' => 'GHS',
    'paymentStatus' => 'unpaid',
    'message' => 'Verification payment integration coming soon',
    'nextStep' => 'admin_review',
]);
