-- Dark Secret — provider registration & verification (safe / additive).
-- Run manually in phpMyAdmin / MySQL. Does NOT drop existing tables or data.
-- Compatible with existing users / auth schema.

-- Optional: add provider role value if your MySQL supports ENUM alteration.
-- If this fails because the value already exists, ignore and continue.
-- ALTER TABLE `users`
--   MODIFY COLUMN `role` ENUM(
--     'user', 'provider', 'massage_provider', 'admin', 'moderator', 'finance_admin', 'support_admin'
--   ) NOT NULL DEFAULT 'user';

CREATE TABLE IF NOT EXISTS `provider_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(120) NOT NULL,
    `city` VARCHAR(120) NOT NULL,
    `region` VARCHAR(120) NULL,
    `country` VARCHAR(120) NOT NULL DEFAULT 'Ghana',
    `about` TEXT NULL,
    `services_json` JSON NULL,
    `starting_price` DECIMAL(10,2) NULL,
    `currency` VARCHAR(8) NOT NULL DEFAULT 'GHS',
    `availability` VARCHAR(32) NULL,
    `service_setting_json` JSON NULL,
    `languages_json` JSON NULL,
    `primary_image` VARCHAR(512) NULL,
    `gallery_json` JSON NULL,
    `public_phone` TINYINT(1) NOT NULL DEFAULT 0,
    `public_whatsapp` TINYINT(1) NOT NULL DEFAULT 0,
    `public_email` TINYINT(1) NOT NULL DEFAULT 0,
    `profile_completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `provider_profiles_user_id_key`(`user_id`),
    UNIQUE INDEX `provider_profiles_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `provider_verification` (
    `id` VARCHAR(191) NOT NULL,
    `provider_user_id` VARCHAR(191) NOT NULL,
    `phone_verified_at` DATETIME(3) NULL,
    `email_verified_at` DATETIME(3) NULL,
    `identity_status` ENUM('not_submitted', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'not_submitted',
    `payment_status` ENUM('unpaid', 'pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'unpaid',
    `verification_status` ENUM('unverified', 'pending_review', 'verified', 'rejected', 'changes_requested') NOT NULL DEFAULT 'unverified',
    `verification_fee_amount` DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    `currency` VARCHAR(8) NOT NULL DEFAULT 'GHS',
    `verified_at` DATETIME(3) NULL,
    `verified_by` VARCHAR(191) NULL,
    `rejection_reason` TEXT NULL,
    `admin_notes` TEXT NULL,
    `submitted_for_review_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `provider_verification_user_key`(`provider_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `provider_identity_documents` (
    `id` VARCHAR(191) NOT NULL,
    `provider_user_id` VARCHAR(191) NOT NULL,
    `id_type` VARCHAR(64) NOT NULL,
    `id_number_encrypted` VARCHAR(512) NULL,
    `id_image_path` VARCHAR(512) NOT NULL,
    `selfie_image_path` VARCHAR(512) NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `provider_identity_user_idx`(`provider_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `provider_verification_payments` (
    `id` VARCHAR(191) NOT NULL,
    `provider_user_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    `currency` VARCHAR(8) NOT NULL DEFAULT 'GHS',
    `status` ENUM('unpaid', 'pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'unpaid',
    `gateway` VARCHAR(64) NULL,
    `gateway_reference` VARCHAR(191) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `provider_payments_user_idx`(`provider_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Extend phone tokens with attempt tracking when columns are missing (run individually if needed).
-- ALTER TABLE `phone_verification_tokens` ADD COLUMN `attempts` INT NOT NULL DEFAULT 0;
-- ALTER TABLE `phone_verification_tokens` ADD COLUMN `last_sent_at` DATETIME(3) NULL;
