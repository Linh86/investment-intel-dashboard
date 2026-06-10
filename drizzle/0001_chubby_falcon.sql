CREATE TABLE `risk_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`ticker` text NOT NULL,
	`run_id` text NOT NULL,
	`rubric_version` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`composite` integer NOT NULL,
	`previous` integer,
	`summary` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `risk_evidence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subscore_id` integer NOT NULL,
	`signal_id` text NOT NULL,
	`quote` text NOT NULL,
	`delta` integer NOT NULL,
	FOREIGN KEY (`subscore_id`) REFERENCES `risk_subscores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`signal_id`) REFERENCES `signals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `risk_subscores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`assessment_id` text NOT NULL,
	`dimension` text NOT NULL,
	`score` integer NOT NULL,
	`baseline` integer NOT NULL,
	`confidence` real NOT NULL,
	`rationale` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `risk_assessments`(`id`) ON UPDATE no action ON DELETE no action
);
