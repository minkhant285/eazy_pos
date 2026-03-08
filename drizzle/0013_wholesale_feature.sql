ALTER TABLE `customers` ADD `customer_type` text NOT NULL DEFAULT 'retail';--> statement-breakpoint
ALTER TABLE `products` ADD `wholesale_price` real;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `wholesale_price` real;
