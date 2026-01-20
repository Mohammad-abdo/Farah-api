-- CreateTable
CREATE TABLE `reports` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('USERS', 'BOOKINGS', 'VENUES', 'SERVICES', 'PAYMENTS', 'REVIEWS', 'CATEGORIES', 'CUSTOM') NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `filters` JSON NULL,
    `format` ENUM('PDF', 'CSV', 'EXCEL') NOT NULL DEFAULT 'PDF',
    `generatedBy` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'GENERATING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_generatedBy_fkey` FOREIGN KEY (`generatedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
