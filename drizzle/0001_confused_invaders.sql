CREATE TABLE `kitchen_imports` (
	`owner_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`data` text NOT NULL,
	`imported_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `batch_id`)
);
