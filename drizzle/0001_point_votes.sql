CREATE TABLE `point_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`target_kind` text NOT NULL,
	`target_id` text NOT NULL,
	`device_hash` text NOT NULL,
	`vote` text NOT NULL,
	`day` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `point_votes_device_day` ON `point_votes` (`target_kind`,`target_id`,`device_hash`,`day`);--> statement-breakpoint
CREATE INDEX `point_votes_target_time` ON `point_votes` (`target_kind`,`target_id`,`created_at`);