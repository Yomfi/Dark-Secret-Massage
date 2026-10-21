<?php
declare(strict_types=1);

function ds_validate_register(array $body): array
{
    $errors = [];

    $firstName = trim((string) ($body['firstName'] ?? ''));
    $lastName = trim((string) ($body['lastName'] ?? ''));
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $phone = trim((string) ($body['phone'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    $confirm = (string) ($body['confirmPassword'] ?? '');
    $terms = $body['termsAccepted'] ?? false;

    if ($firstName === '' || strlen($firstName) > 100) {
        $errors[] = ['path' => 'firstName', 'message' => 'Enter a valid first name.'];
    }
    if ($lastName === '' || strlen($lastName) > 100) {
        $errors[] = ['path' => 'lastName', 'message' => 'Enter a valid last name.'];
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255) {
        $errors[] = ['path' => 'email', 'message' => 'Enter a valid email address.'];
    }
    if (!preg_match('/^[+\d][\d\s()-]{7,}$/', $phone) || strlen($phone) < 9 || strlen($phone) > 20) {
        $errors[] = ['path' => 'phone', 'message' => 'Enter a valid phone number.'];
    }
    if (strlen($password) < 8 || strlen($password) > 128) {
        $errors[] = ['path' => 'password', 'message' => 'Password must be at least 8 characters.'];
    } elseif (!preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9]/', $password)) {
        $errors[] = ['path' => 'password', 'message' => 'Password must include a letter and a number.'];
    }
    if ($password !== $confirm) {
        $errors[] = ['path' => 'confirmPassword', 'message' => 'Passwords do not match.'];
    }
    if ($terms !== true && $terms !== 1 && $terms !== 'true') {
        $errors[] = ['path' => 'termsAccepted', 'message' => 'You must accept the terms to continue.'];
    }

    if ($errors) {
        ds_error(400, 'VALIDATION_ERROR', 'Please check your input and try again.', $errors);
    }

    return [
        'firstName' => $firstName,
        'lastName' => $lastName,
        'email' => $email,
        'phone' => preg_replace('/\s+/', '', $phone) ?? $phone,
        'password' => $password,
    ];
}

function ds_validate_login(array $body): array
{
    $identifier = trim((string) ($body['identifier'] ?? ''));
    $password = (string) ($body['password'] ?? '');

    if (strlen($identifier) < 3 || strlen($identifier) > 255 || $password === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Please check your input and try again.');
    }

    return [
        'identifier' => $identifier,
        'password' => $password,
    ];
}

function ds_validate_forgot(array $body): string
{
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        ds_error(400, 'VALIDATION_ERROR', 'Please check your input and try again.');
    }
    return $email;
}

function ds_validate_reset(array $body): array
{
    $token = (string) ($body['token'] ?? '');
    $password = (string) ($body['password'] ?? '');
    $confirm = (string) ($body['confirmPassword'] ?? '');

    if (strlen($token) < 20) {
        ds_error(400, 'VALIDATION_ERROR', 'Invalid or expired reset token.');
    }
    if (strlen($password) < 8 || strlen($password) > 128) {
        ds_error(400, 'VALIDATION_ERROR', 'Password must be at least 8 characters.');
    }
    if (!preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9]/', $password)) {
        ds_error(400, 'VALIDATION_ERROR', 'Password must include a letter and a number.');
    }
    if ($password !== $confirm) {
        ds_error(400, 'VALIDATION_ERROR', 'Passwords do not match.');
    }

    return ['token' => $token, 'password' => $password];
}

function ds_validate_onboarding(array $body): string
{
    $choice = (string) ($body['choice'] ?? '');
    $allowed = ['find_partner', 'book_massage', 'become_provider'];
    if (!in_array($choice, $allowed, true)) {
        ds_error(400, 'VALIDATION_ERROR', 'Please choose a valid onboarding option.');
    }
    return $choice;
}
