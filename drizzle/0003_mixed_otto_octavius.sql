CREATE TABLE `billing_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`received_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_receipts` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`subscription_id` text,
	`status` text NOT NULL,
	`event_id` text NOT NULL,
	`updated_at` text NOT NULL
);
