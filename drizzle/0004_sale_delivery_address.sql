ALTER TABLE `sales` ADD COLUMN `delivery_address_id` text REFERENCES `customer_addresses`(`id`);
