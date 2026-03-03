ALTER TABLE `sales` ADD COLUMN `order_type` text NOT NULL DEFAULT 'pos';
--> statement-breakpoint
ALTER TABLE `sales` ADD COLUMN `online_status` text;
--> statement-breakpoint
ALTER TABLE `sales` ADD COLUMN `delivery_fee` real NOT NULL DEFAULT 0;
