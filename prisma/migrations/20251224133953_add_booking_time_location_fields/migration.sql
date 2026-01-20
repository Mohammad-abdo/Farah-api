-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `endTime` VARCHAR(191) NULL,
    ADD COLUMN `location` VARCHAR(191) NULL,
    ADD COLUMN `locationAddress` TEXT NULL,
    ADD COLUMN `locationLatitude` DOUBLE NULL,
    ADD COLUMN `locationLongitude` DOUBLE NULL,
    ADD COLUMN `startTime` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `venues` ADD COLUMN `workingHoursEnd` VARCHAR(191) NULL,
    ADD COLUMN `workingHoursStart` VARCHAR(191) NULL;
