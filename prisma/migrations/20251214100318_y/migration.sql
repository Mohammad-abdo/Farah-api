-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `eventDate` VARCHAR(191) NULL,
    MODIFY `status` ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `categories` ADD COLUMN `image` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `services` ADD COLUMN `descriptionAr` TEXT NULL;

-- AlterTable
ALTER TABLE `venues` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `clients` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `descriptionAr` TEXT NULL;
