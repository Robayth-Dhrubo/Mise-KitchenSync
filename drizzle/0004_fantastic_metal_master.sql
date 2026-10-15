CREATE TABLE `inventory_events` (
	`owner_id` text NOT NULL,
	`location_id` text DEFAULT 'primary' NOT NULL,
	`event_id` text NOT NULL,
	`kind` text NOT NULL,
	`occurred_on` text NOT NULL,
	`recorded_at` text NOT NULL,
	`revision` integer NOT NULL,
	`reference_id` text,
	`request_hash` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`owner_id`, `location_id`, `event_id`)
);
--> statement-breakpoint
CREATE INDEX `inventory_events_owner_time` ON `inventory_events` (`owner_id`,`location_id`,`recorded_at`,`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_events_reference` ON `inventory_events` (`owner_id`,`location_id`,`kind`,`reference_id`);--> statement-breakpoint
ALTER TABLE `kitchen_workspaces` ADD `save_token` text;