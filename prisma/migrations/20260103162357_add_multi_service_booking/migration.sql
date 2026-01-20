-- AlterTable
ALTER TABLE `booking_services` ADD COLUMN `date` DATETIME(3) NULL,
    ADD COLUMN `duration` INTEGER NULL,
    ADD COLUMN `endTime` VARCHAR(191) NULL,
    ADD COLUMN `locationAddress` TEXT NULL,
    ADD COLUMN `locationLatitude` DOUBLE NULL,
    ADD COLUMN `locationLongitude` DOUBLE NULL,
    ADD COLUMN `locationType` VARCHAR(191) NULL,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `startTime` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `bookingType` ENUM('VENUE_ONLY', 'SERVICES_ONLY', 'MIXED') NOT NULL DEFAULT 'MIXED';

-- AlterTable
ALTER TABLE `services` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL,
    ADD COLUMN `pricePerHour` DOUBLE NULL,
    ADD COLUMN `requiresVenue` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `serviceType` ENUM('VENUE', 'FOOD_PROVIDER', 'PHOTOGRAPHER', 'CAR', 'DECORATION', 'DJ', 'FLORIST', 'OTHER') NOT NULL DEFAULT 'OTHER',
    ADD COLUMN `workingHoursEnd` VARCHAR(191) NULL,
    ADD COLUMN `workingHoursStart` VARCHAR(191) NULL,
    ADD COLUMN `worksExternal` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `worksInVenues` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `service_holidays` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `reason` TEXT NULL,
    `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `service_holidays_serviceId_date_key`(`serviceId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `services_serviceType_idx` ON `services`(`serviceType`);

-- AddForeignKey
ALTER TABLE `service_holidays` ADD CONSTRAINT `service_holidays_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (only if not exists)
CREATE INDEX IF NOT EXISTS `services_categoryId_idx` ON `services`(`categoryId`);

-- CreateIndex (only if not exists)
CREATE INDEX IF NOT EXISTS `services_providerId_idx` ON `services`(`providerId`);
