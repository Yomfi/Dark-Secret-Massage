-- Massager Studio — staff RBAC, customer notes, announcements, privacy requests.
-- Apply only via: php scripts/migrate.php --apply --backup=<dump>
-- Do not run this from an HTTP request.

CREATE TABLE IF NOT EXISTS staff_profiles (
  user_id VARCHAR(191) NOT NULL,
  staff_role VARCHAR(40) NOT NULL DEFAULT 'support',
  is_active INT NOT NULL DEFAULT 1,
  invited_by VARCHAR(191) NULL,
  invited_at DATETIME(3) NULL,
  activated_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_invitations (
  id VARCHAR(191) NOT NULL,
  email VARCHAR(255) NOT NULL,
  staff_role VARCHAR(40) NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  invited_by VARCHAR(191) NULL,
  expires_at DATETIME(3) NOT NULL,
  accepted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS customer_notes (
  id VARCHAR(191) NOT NULL,
  customer_user_id VARCHAR(191) NOT NULL,
  author_user_id VARCHAR(191) NULL,
  body TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id VARCHAR(191) NOT NULL,
  customer_user_id VARCHAR(191) NOT NULL,
  request_type VARCHAR(20) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  notes TEXT NULL,
  created_by VARCHAR(191) NULL,
  resolved_by VARCHAR(191) NULL,
  resolved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS cms_announcements (
  id VARCHAR(191) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body_html TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at DATETIME(3) NULL,
  created_by VARCHAR(191) NULL,
  updated_by VARCHAR(191) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id)
);

-- Optional alt text on media (additive).
-- ALTER TABLE media_assets ADD COLUMN alt_text VARCHAR(255) NULL;
