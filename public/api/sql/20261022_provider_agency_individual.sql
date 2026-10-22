-- Dark Secret — agency / individual provider extension (safe / additive).
-- Run manually in phpMyAdmin / MySQL after 20261021_provider_verification.sql.
-- Does NOT drop existing tables or data.
-- If a column already exists, skip that ALTER and continue.

-- ---------------------------------------------------------------------------
-- provider_profiles — new columns
-- ---------------------------------------------------------------------------

ALTER TABLE `provider_profiles`
  ADD COLUMN `provider_type` ENUM('individual', 'agency') NOT NULL DEFAULT 'individual'
  AFTER `display_name`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `gender` ENUM('female', 'male') NULL
  AFTER `provider_type`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `business_name` VARCHAR(160) NULL
  AFTER `gender`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `business_registration_number` VARCHAR(120) NULL
  AFTER `business_name`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `contact_first_name` VARCHAR(80) NULL
  AFTER `business_registration_number`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `contact_last_name` VARCHAR(80) NULL
  AFTER `contact_first_name`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `date_of_birth` DATE NULL
  AFTER `contact_last_name`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `age` TINYINT UNSIGNED NULL
  AFTER `date_of_birth`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `whatsapp_number` VARCHAR(40) NULL
  AFTER `age`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `area_neighbourhood` VARCHAR(160) NULL
  AFTER `city`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `business_address` VARCHAR(255) NULL
  AFTER `area_neighbourhood`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `service_area` TEXT NULL
  AFTER `business_address`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `service_radius_km` DECIMAL(8,2) NULL
  AFTER `service_area`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `years_experience` INT UNSIGNED NULL
  AFTER `service_radius_km`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `working_days` VARCHAR(160) NULL
  AFTER `years_experience`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `working_hours` VARCHAR(160) NULL
  AFTER `working_days`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `cover_image` VARCHAR(512) NULL
  AFTER `primary_image`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `rates_json` JSON NULL
  AFTER `starting_price`;

ALTER TABLE `provider_profiles`
  ADD COLUMN `profile_completion` TINYINT UNSIGNED NOT NULL DEFAULT 0
  AFTER `public_email`;

ALTER TABLE `provider_profiles`
  ADD INDEX `provider_profiles_type_idx` (`provider_type`);

ALTER TABLE `provider_profiles`
  ADD INDEX `provider_profiles_gender_idx` (`gender`);

-- ---------------------------------------------------------------------------
-- agency team members (no separate login required yet)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `agency_team_members` (
    `id` VARCHAR(191) NOT NULL,
    `agency_profile_id` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(120) NOT NULL,
    `gender` ENUM('female', 'male') NOT NULL,
    `bio` TEXT NULL,
    `profile_image` VARCHAR(512) NULL,
    `gallery_json` JSON NULL,
    `services_json` JSON NULL,
    `years_experience` INT UNSIGNED NULL,
    `availability` VARCHAR(64) NULL,
    `pricing_json` JSON NULL,
    `inherit_agency_rate` TINYINT(1) NOT NULL DEFAULT 1,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `agency_team_agency_idx`(`agency_profile_id`),
    INDEX `agency_team_gender_idx`(`gender`),
    INDEX `agency_team_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
