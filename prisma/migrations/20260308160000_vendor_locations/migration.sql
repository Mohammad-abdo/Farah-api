-- AlterTable: add location fields to vendors
ALTER TABLE `vendors` ADD COLUMN `country` VARCHAR(191) NULL;
ALTER TABLE `vendors` ADD COLUMN `city` VARCHAR(191) NULL;
ALTER TABLE `vendors` ADD COLUMN `area` VARCHAR(191) NULL;
ALTER TABLE `vendors` ADD COLUMN `googleMapsLink` TEXT NULL;

-- CreateTable: vendor_locations
CREATE TABLE `vendor_locations` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `locationName` VARCHAR(191) NOT NULL,
    `address` TEXT NULL,
    `city` VARCHAR(191) NULL,
    `area` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `isMainLocation` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    INDEX `vendor_locations_vendorId_idx`(`vendorId`),
    CONSTRAINT `vendor_locations_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: vendor_orders - add location fields
ALTER TABLE `vendor_orders` ADD COLUMN `vendorLocationId` VARCHAR(191) NULL;
ALTER TABLE `vendor_orders` ADD COLUMN `customerLatitude` DOUBLE NULL;
ALTER TABLE `vendor_orders` ADD COLUMN `customerLongitude` DOUBLE NULL;
ALTER TABLE `vendor_orders` ADD COLUMN `vendorLatitude` DOUBLE NULL;
ALTER TABLE `vendor_orders` ADD COLUMN `vendorLongitude` DOUBLE NULL;

-- Add FK for vendor_orders.vendorLocationId
ALTER TABLE `vendor_orders` ADD CONSTRAINT `vendor_orders_vendorLocationId_fkey` FOREIGN KEY (`vendorLocationId`) REFERENCES `vendor_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
