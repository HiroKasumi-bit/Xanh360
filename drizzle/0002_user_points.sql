CREATE TABLE `user_points` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`groups` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`accuracy` integer NOT NULL,
	`device_hash` text NOT NULL,
	`day` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `user_points_device_day` ON `user_points` (`device_hash`,`day`);--> statement-breakpoint
CREATE INDEX `user_points_created` ON `user_points` (`created_at`);