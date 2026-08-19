CREATE TABLE `token_blacklist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jti` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `token_blacklist_jti_unique` ON `token_blacklist` (`jti`);--> statement-breakpoint
ALTER TABLE `users` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `deleted_at` text;