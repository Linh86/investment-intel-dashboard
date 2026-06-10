CREATE TABLE `claim_signals` (
	`claim_id` text NOT NULL,
	`signal_id` text NOT NULL,
	PRIMARY KEY(`claim_id`, `signal_id`),
	FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`signal_id`) REFERENCES `signals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`claim_text` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`artifact_ref` text,
	`approved_by` text,
	`approved_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `client_segments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`jurisdiction` text NOT NULL,
	`profile_note` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`ticker` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sector` text NOT NULL,
	`sub_sector` text NOT NULL,
	`country` text NOT NULL,
	`watch_reason` text NOT NULL,
	`baseline_risk` integer NOT NULL,
	`added_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `delivery_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brief_id` text NOT NULL,
	`segment_id` text NOT NULL,
	`channel` text NOT NULL,
	`delivered_at` text NOT NULL,
	`delivered_by` text NOT NULL,
	FOREIGN KEY (`brief_id`) REFERENCES `investor_briefs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`segment_id`) REFERENCES `client_segments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `investor_briefs` (
	`id` text PRIMARY KEY NOT NULL,
	`segment_id` text NOT NULL,
	`period` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`supersedes_id` text,
	`sections_json` text NOT NULL,
	`disclosure_versions` text,
	`published_at` text,
	`published_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`segment_id`) REFERENCES `client_segments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `raw_items` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`snippet` text NOT NULL,
	`source_name` text NOT NULL,
	`source_url` text NOT NULL,
	`published_at` text NOT NULL,
	`hash` text NOT NULL,
	`created_at` text NOT NULL,
	`triaged_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raw_items_hash_unique` ON `raw_items` (`hash`);--> statement-breakpoint
CREATE TABLE `run_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`input_count` integer DEFAULT 0 NOT NULL,
	`output_count` integer DEFAULT 0 NOT NULL,
	`tokens_in` integer DEFAULT 0 NOT NULL,
	`tokens_out` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`detail` text,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`trigger` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`note` text,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `signals` (
	`id` text PRIMARY KEY NOT NULL,
	`raw_item_id` text NOT NULL,
	`run_id` text,
	`ticker` text NOT NULL,
	`type` text NOT NULL,
	`urgency` text NOT NULL,
	`relevance` text NOT NULL,
	`confidence` real NOT NULL,
	`rationale` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`raw_item_id`) REFERENCES `raw_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE no action
);
