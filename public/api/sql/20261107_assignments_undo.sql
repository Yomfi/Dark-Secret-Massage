-- Massager Studio — customer assignments + reversible admin actions (additive).
-- Applied by ds_cms_migrate() and by api/tools/migrate.php --apply --backup=<verified dump>.
-- No existing table, column or row is modified by this migration.

CREATE TABLE IF NOT EXISTS provider_assignments (
  id VARCHAR(191) NOT NULL,
  customer_user_id VARCHAR(191) NOT NULL,
  provider_profile_id VARCHAR(191) NOT NULL,
  team_member_id VARCHAR(191) NULL,
  service_id VARCHAR(191) NULL,
  service_name VARCHAR(160) NULL,
  preferred_at DATETIME(3) NULL,
  reason VARCHAR(500) NOT NULL,
  notes TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'proposed',
  status_note VARCHAR(500) NULL,
  assigned_by VARCHAR(191) NULL,
  cancelled_at DATETIME(3) NULL,
  cancelled_by VARCHAR(191) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY provider_assignments_customer_idx (customer_user_id),
  KEY provider_assignments_provider_idx (provider_profile_id),
  KEY provider_assignments_status_idx (status),
  KEY provider_assignments_preferred_idx (preferred_at)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS provider_assignment_events (
  id VARCHAR(191) NOT NULL,
  assignment_id VARCHAR(191) NOT NULL,
  actor_user_id VARCHAR(191) NULL,
  event VARCHAR(40) NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NULL,
  note VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY provider_assignment_events_assignment_idx (assignment_id),
  KEY provider_assignment_events_created_idx (created_at)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_reversible_actions (
  id VARCHAR(191) NOT NULL,
  actor_user_id VARCHAR(191) NULL,
  action VARCHAR(80) NOT NULL,
  label VARCHAR(255) NOT NULL,
  entity_table VARCHAR(64) NOT NULL,
  entity_id VARCHAR(191) NOT NULL,
  before_json TEXT NULL,
  after_json TEXT NULL,
  meta_json TEXT NULL,
  undone_at DATETIME(3) NULL,
  undone_by VARCHAR(191) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY admin_reversible_actor_idx (actor_user_id),
  KEY admin_reversible_entity_idx (entity_table, entity_id),
  KEY admin_reversible_created_idx (created_at)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
