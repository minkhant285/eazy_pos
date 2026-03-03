CREATE TABLE `payment_accounts` (
  `id` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL,
  `account_number` text NOT NULL,
  `account_name` text NOT NULL,
  `provider_logo` text,
  `qr_code` text,
  `is_active` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);
