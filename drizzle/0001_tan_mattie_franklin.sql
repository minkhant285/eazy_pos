CREATE TABLE `expense_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#8b5cf6' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expense_categories_name_unique` ON `expense_categories` (`name`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_no` text NOT NULL,
	`category_id` text NOT NULL,
	`location_id` text,
	`amount` real NOT NULL,
	`description` text NOT NULL,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`expense_date` text NOT NULL,
	`notes` text,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expenses_expense_no_unique` ON `expenses` (`expense_no`);--> statement-breakpoint
CREATE INDEX `idx_expenses_category` ON `expenses` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_expenses_date` ON `expenses` (`expense_date`);