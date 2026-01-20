-- CreateTable
CREATE TABLE `venue_holidays` (
    `id` VARCHAR(191) NOT NULL,
    `venueId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `reason` TEXT NULL,
    `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `venue_holidays_venueId_date_key`(`venueId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `venue_holidays` ADD CONSTRAINT `venue_holidays_venueId_fkey` FOREIGN KEY (`venueId`) REFERENCES `venues`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
