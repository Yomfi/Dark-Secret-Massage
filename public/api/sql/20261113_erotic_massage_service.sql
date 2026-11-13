-- Massager Studio — add the Erotic Massage service to the platform catalogue.
-- Additive and idempotent: re-running changes nothing and never duplicates the row.
-- Never assigns the service to a provider, so existing provider selections,
-- verification statuses and moderation state are untouched.
--
-- The row is created as an unpublished draft (is_active = 0) so no price is
-- invented for a public listing. An admin sets the real duration, price and
-- non-explicit description in /admin → Services, then activates it.
--
-- Erotic Massage is an adults-only (18+) category: descriptions must remain
-- lawful and non-explicit, and no imagery may be attached here.

INSERT INTO `services`
  (`id`, `provider_profile_id`, `name`, `description`, `duration_minutes`, `price`, `currency`,
   `image_path`, `category`, `is_active`, `sort_order`, `created_by`, `created_at`, `updated_at`)
SELECT
  'svc_erotic_massage', NULL, 'Erotic Massage', NULL, 60, 0.00, 'GHS',
  NULL, 'adult', 0, 0, NULL, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `services`
  WHERE `provider_profile_id` IS NULL AND `name` = 'Erotic Massage'
);
