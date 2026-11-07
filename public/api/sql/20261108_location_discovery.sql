-- Massager Studio — structured locations, service areas and discovery support.
-- Additive only. Applied by ds_location_ensure_schema(true) through api/tools/migrate.php.

CREATE TABLE IF NOT EXISTS customer_locations (
  user_id VARCHAR(191) NOT NULL,
  country VARCHAR(80) NOT NULL DEFAULT 'Ghana',
  region VARCHAR(120) NULL,
  district VARCHAR(160) NULL,
  city VARCHAR(160) NULL,
  area VARCHAR(160) NULL,
  description VARCHAR(500) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id),
  KEY customer_locations_region_idx (region),
  KEY customer_locations_city_idx (city)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE provider_profiles
  ADD COLUMN district VARCHAR(160) NULL,
  ADD COLUMN latitude DECIMAL(10,7) NULL,
  ADD COLUMN longitude DECIMAL(10,7) NULL,
  ADD COLUMN service_areas_json TEXT NULL,
  ADD COLUMN service_regions_json TEXT NULL;

CREATE INDEX provider_profiles_region_idx ON provider_profiles (region);
CREATE INDEX provider_profiles_city_idx ON provider_profiles (city);
