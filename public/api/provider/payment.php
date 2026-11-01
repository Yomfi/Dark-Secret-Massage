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

    $membership = ds_membership_status();

    ds_success([
        'feeEnabled' => $membership['feeEnabled'],
        'feeRequired' => $membership['feeRequired'],
        'free' => $membership['free'],
        'feeAmount' => $membership['feeAmount'],
        'standardFeeAmount' => $membership['standardFeeAmount'],
        'currency' => $membership['currency'],
        'paymentStatus' => $verification['payment_status'] ?? 'unpaid',
        'gatewayReady' => false,
        'message' => $membership['message'],
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

// Membership is free while the fee is disabled: never record a fake payment.
if (!ds_membership_fee_enabled()) {
    ds_success([
        'initiated' => false,
        'free' => true,
        'feeEnabled' => false,
        'feeAmount' => 0.0,
        'currency' => ds_membership_currency(),
        'paymentStatus' => $verification['payment_status'] ?? 'unpaid',
        'gatewayReady' => false,
        'message' => 'Membership is currently free. Continue to submit your profile for review.',
        'nextStep' => 'admin_review',
    ]);
}

// Do not fake successful payments. Record intent only.
$now = ds_now_sql();
$pdo = ds_pdo();
$paymentId = ds_new_id();

$pdo->prepare(
    'INSERT INTO provider_verification_payments
     (id, provider_user_id, amount, currency, status, gateway, created_at, updated_at)
     VALUES (?, ?, ?, ?, \'unpaid\', \'paystack_pending\', ?, ?)'
)->execute([
    $paymentId,
    $user['id'],
    ds_membership_fee_amount(),
    ds_membership_currency(),
    $now,
    $now,
]);

$pdo->prepare(
    'UPDATE provider_verification SET payment_status = \'unpaid\', updated_at = ? WHERE provider_user_id = ?'
)->execute([$now, $user['id']]);

ds_success([
    'initiated' => false,
    'gatewayReady' => false,
    'paymentId' => $paymentId,
    'feeAmount' => ds_membership_fee_amount(),
    'currency' => ds_membership_currency(),
    'paymentStatus' => 'unpaid',
    'message' => 'Verification payment integration coming soon',
    'nextStep' => 'admin_review',
]);
