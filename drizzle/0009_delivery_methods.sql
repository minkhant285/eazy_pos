CREATE TABLE `delivery_methods` (
  `id` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL,
  `logo_url` text,
  `is_active` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
ALTER TABLE `sales` ADD COLUMN `delivery_method_id` text REFERENCES `delivery_methods`(`id`);
