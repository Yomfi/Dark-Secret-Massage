-- Optional identity verification (Verify My Identity / Verify Later).
-- Additive only: existing verification rows and approved providers are preserved.
-- Apply through api/tools/migrate.php so the CLI backup/confirmation guards run.

ALTER TABLE `provider_verification`
    ADD COLUMN `verification_choice` VARCHAR(32) NULL,
    ADD COLUMN `business_status` VARCHAR(32) NULL,
    ADD COLUMN `identity_submitted_at` DATETIME(3) NULL,
    ADD COLUMN `selfie_submitted_at` DATETIME(3) NULL;

ALTER TABLE `provider_identity_documents`
    ADD COLUMN `verification_choice` VARCHAR(32) NULL,
    ADD COLUMN `is_current` INT NOT NULL DEFAULT 1;

-- Existing applications used the ID + selfie route. This does not change any
-- identity or verification status, and verified providers remain verified.
UPDATE `provider_verification`
SET `verification_choice` = 'verify_identity'
WHERE `verification_choice` IS NULL
  AND (
      `identity_status` IN ('pending', 'approved')
      OR `verification_status` IN ('pending_review', 'verified')
  );

UPDATE `provider_identity_documents`
SET `verification_choice` = 'verify_identity'
WHERE `verification_choice` IS NULL;
