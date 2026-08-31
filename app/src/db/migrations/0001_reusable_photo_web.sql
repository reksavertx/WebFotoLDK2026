CREATE TABLE `event_settings` (
	`id` int NOT NULL DEFAULT 1,
	`draft_mode` enum('list','free') NOT NULL DEFAULT 'list',
	`active_mode` enum('list','free') NOT NULL DEFAULT 'list',
	`draft_title` varchar(160) NOT NULL DEFAULT 'Pengumpulan Foto LDK',
	`active_title` varchar(160) NOT NULL DEFAULT 'Pengumpulan Foto LDK',
	`draft_year` varchar(4) NOT NULL DEFAULT '2026',
	`active_year` varchar(4) NOT NULL DEFAULT '2026',
	`draft_description` varchar(500) NOT NULL DEFAULT 'Pengumpulan foto LDK SMK NEGERI 1 BATANG Tahun 2026',
	`active_description` varchar(500) NOT NULL DEFAULT 'Pengumpulan foto LDK SMK NEGERI 1 BATANG Tahun 2026',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `event_settings` (`id`, `draft_mode`, `active_mode`, `draft_title`, `active_title`, `draft_year`, `active_year`, `draft_description`, `active_description`) VALUES (1, 'list', 'list', 'Pengumpulan Foto LDK', 'Pengumpulan Foto LDK', '2026', '2026', 'Pengumpulan foto LDK SMK NEGERI 1 BATANG Tahun 2026', 'Pengumpulan foto LDK SMK NEGERI 1 BATANG Tahun 2026');
--> statement-breakpoint
CREATE TABLE `photo_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submission_key` varchar(64) NOT NULL,
	`source_mode` enum('list','free') NOT NULL,
	`student_id` int,
	`name` varchar(160) NOT NULL,
	`class_name` varchar(100),
	`attendance_number` int,
	`nis` varchar(32),
	`storage_path` text NOT NULL,
	`original_filename` text NOT NULL,
	`mime_type` varchar(80) NOT NULL,
	`file_size` int NOT NULL,
	`status` enum('uploaded','blur') NOT NULL DEFAULT 'uploaded',
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `photo_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `photo_submissions_submission_key_unique` UNIQUE(`submission_key`),
	CONSTRAINT `photo_submissions_student_id_unique` UNIQUE(`student_id`)
);
--> statement-breakpoint
DROP TABLE `photos`;
--> statement-breakpoint
ALTER TABLE `photo_submissions` ADD CONSTRAINT `photo_submissions_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;
