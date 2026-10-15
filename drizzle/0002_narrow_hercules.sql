CREATE TABLE `billing_accounts` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_accounts_customer_id_unique` ON `billing_accounts` (`customer_id`);