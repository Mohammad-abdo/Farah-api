-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `depositAmount` DOUBLE NULL,
    ADD COLUMN `depositPaid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `remainingAmount` DOUBLE NULL,
    ADD COLUMN `remainingPaid` BOOLEAN NOT NULL DEFAULT false;
