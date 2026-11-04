-- Additive: provider moderation + public gallery (Hostinger MySQL).
-- Applied automatically by ds_cms_migrate(); this file is the documented source of truth.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_epoch INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspend_reason VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS suspended_until DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS suspend_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS block_reason VARCHAR(500) NULL;

ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS removed_at DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS removed_by VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS remove_reason VARCHAR(500) NULL;

CREATE TABLE IF NOT EXISTS provider_gallery_images (
  id VARCHAR(191) NOT NULL,
  provider_profile_id VARCHAR(191) NOT NULL,
  team_member_id VARCHAR(191) NULL,
  kind VARCHAR(24) NOT NULL DEFAULT 'gallery',
  path VARCHAR(512) NOT NULL,
  thumb_path VARCHAR(512) NULL,
  filename VARCHAR(255) NOT NULL,
  mime VARCHAR(100) NULL,
  size_bytes INT NOT NULL DEFAULT 0,
  width INT NULL,
  height INT NULL,
  alt_text VARCHAR(255) NULL,
  description VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  moderation_status VARCHAR(24) NOT NULL DEFAULT 'approved',
  moderated_by VARCHAR(191) NULL,
  moderated_at DATETIME(3) NULL,
  moderation_reason VARCHAR(500) NULL,
  uploaded_by VARCHAR(191) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY provider_gallery_profile_idx (provider_profile_id),
  KEY provider_gallery_mod_idx (moderation_status)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS provider_moderation_events (
  id VARCHAR(191) NOT NULL,
  provider_user_id VARCHAR(191) NOT NULL,
  actor_user_id VARCHAR(191) NULL,
  action VARCHAR(40) NOT NULL,
  reason VARCHAR(500) NULL,
  notes TEXT NULL,
  until_at DATETIME(3) NULL,
  meta_json TEXT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY provider_mod_user_idx (provider_user_id),
  KEY provider_mod_created_idx (created_at)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
