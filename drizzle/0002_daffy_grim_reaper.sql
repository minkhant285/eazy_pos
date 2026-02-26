CREATE TABLE `product_variant_options` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`option_id` text NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`option_id`) REFERENCES `variant_options`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `uniq_variant_option` ON `product_variant_options` (`variant_id`,`option_id`);--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`sku` text NOT NULL,
	`barcode` text,
	`cost_price` real DEFAULT 0 NOT NULL,
	`selling_price` real NOT NULL,
	`image_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_sku_unique` ON `product_variants` (`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_barcode_unique` ON `product_variants` (`barcode`);--> statement-breakpoint
CREATE TABLE `variant_attributes` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `variant_options` (
	`id` text PRIMARY KEY NOT NULL,
	`attribute_id` text NOT NULL,
	`value` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`attribute_id`) REFERENCES `variant_attributes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `variant_stock` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`location_id` text NOT NULL,
	`qty_on_hand` real DEFAULT 0 NOT NULL,
	`qty_reserved` real DEFAULT 0 NOT NULL,
	`qty_available` real GENERATED ALWAYS AS (qty_on_hand - qty_reserved) VIRTUAL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `uniq_variant_location` ON `variant_stock` (`variant_id`,`location_id`);--> statement-breakpoint
ALTER TABLE `sale_items` ADD `variant_id` text REFERENCES product_variants(id);--> statement-breakpoint
ALTER TABLE `stock_ledger` ADD `variant_id` text REFERENCES product_variants(id);