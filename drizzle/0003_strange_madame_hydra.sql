ALTER TABLE `claims` ADD `kind` text DEFAULT 'key-change' NOT NULL;--> statement-breakpoint
ALTER TABLE `investor_briefs` ADD `reviewed_by` text;--> statement-breakpoint
ALTER TABLE `investor_briefs` ADD `review_note` text;