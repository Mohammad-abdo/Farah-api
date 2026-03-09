-- Unify Vendor and Service Provider: Vendor = User with role PROVIDER (مزود الخدمة = المورد)
-- Step 1: No enum change — use existing PROVIDER role

-- Step 2: Create vendor_profiles table
CREATE TABLE `vendor_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `vendorType` ENUM('RESTAURANT', 'FASHION_STORE', 'SWEETS_SHOP', 'HEADPHONES_RENTAL') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `businessName` VARCHAR(191) NULL,
    `businessNameAr` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `avatar` LONGTEXT NULL,
    `address` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `area` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `googleMapsLink` TEXT NULL,
    `phoneVerified` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `rating` DOUBLE NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `vendor_profiles_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 3: Copy vendors into users (use vendor.id as user.id so child FKs stay valid)
INSERT INTO `users` (`id`, `name`, `nameAr`, `email`, `phone`, `password`, `location`, `locationAr`, `avatar`, `role`, `isActive`, `lastLogin`, `createdAt`, `updatedAt`)
SELECT v.`id`, v.`name`, NULL, NULL, v.`phone`, v.`password`, v.`address`, NULL, v.`avatar`, 'PROVIDER', v.`isActive`, v.`lastLogin`, v.`createdAt`, v.`updatedAt`
FROM `vendors` v;

-- Step 4: Copy vendor-specific data into vendor_profiles
INSERT INTO `vendor_profiles` (`id`, `userId`, `vendorType`, `status`, `businessName`, `businessNameAr`, `description`, `avatar`, `address`, `country`, `city`, `area`, `latitude`, `longitude`, `googleMapsLink`, `phoneVerified`, `isActive`, `rating`, `createdAt`, `updatedAt`)
SELECT UUID(), v.`id`, v.`vendorType`, v.`status`, v.`businessName`, v.`businessNameAr`, v.`description`, v.`avatar`, v.`address`, v.`country`, v.`city`, v.`area`, v.`latitude`, v.`longitude`, v.`googleMapsLink`, v.`phoneVerified`, v.`isActive`, 0, v.`createdAt`, v.`updatedAt`
FROM `vendors` v;

-- Step 5: Add userId to vendor_wallets and migrate
ALTER TABLE `vendor_wallets` ADD COLUMN `userId` VARCHAR(191) NULL;
UPDATE `vendor_wallets` SET `userId` = `vendorId` WHERE `vendorId` IS NOT NULL;
ALTER TABLE `vendor_wallets` DROP FOREIGN KEY `vendor_wallets_vendorId_fkey`;
ALTER TABLE `vendor_wallets` DROP COLUMN `vendorId`;
ALTER TABLE `vendor_wallets` MODIFY COLUMN `userId` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `vendor_wallets_userId_key` ON `vendor_wallets`(`userId`);
ALTER TABLE `vendor_wallets` ADD CONSTRAINT `vendor_wallets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: vendor_transactions
ALTER TABLE `vendor_transactions` ADD COLUMN `userId` VARCHAR(191) NULL;
UPDATE `vendor_transactions` SET `userId` = `vendorId` WHERE `vendorId` IS NOT NULL;
ALTER TABLE `vendor_transactions` DROP FOREIGN KEY `vendor_transactions_vendorId_fkey`;
ALTER TABLE `vendor_transactions` DROP COLUMN `vendorId`;
ALTER TABLE `vendor_transactions` MODIFY COLUMN `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `vendor_transactions` ADD CONSTRAINT `vendor_transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: vendor_locations
ALTER TABLE `vendor_locations` ADD COLUMN `userId` VARCHAR(191) NULL;
UPDATE `vendor_locations` SET `userId` = `vendorId` WHERE `vendorId` IS NOT NULL;
ALTER TABLE `vendor_locations` DROP FOREIGN KEY `vendor_locations_vendorId_fkey`;
ALTER TABLE `vendor_locations` DROP COLUMN `vendorId`;
ALTER TABLE `vendor_locations` MODIFY COLUMN `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `vendor_locations` ADD CONSTRAINT `vendor_locations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: vendor_services
ALTER TABLE `vendor_services` ADD COLUMN `userId` VARCHAR(191) NULL;
UPDATE `vendor_services` SET `userId` = `vendorId` WHERE `vendorId` IS NOT NULL;
ALTER TABLE `vendor_services` DROP FOREIGN KEY `vendor_services_vendorId_fkey`;
ALTER TABLE `vendor_services` DROP COLUMN `vendorId`;
ALTER TABLE `vendor_services` MODIFY COLUMN `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `vendor_services` ADD CONSTRAINT `vendor_services_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: vendor_orders
ALTER TABLE `vendor_orders` ADD COLUMN `userId` VARCHAR(191) NULL;
UPDATE `vendor_orders` SET `userId` = `vendorId` WHERE `vendorId` IS NOT NULL;
ALTER TABLE `vendor_orders` DROP FOREIGN KEY `vendor_orders_vendorId_fkey`;
ALTER TABLE `vendor_orders` DROP COLUMN `vendorId`;
ALTER TABLE `vendor_orders` MODIFY COLUMN `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `vendor_orders` ADD CONSTRAINT `vendor_orders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 10: system_commission_records
ALTER TABLE `system_commission_records` ADD COLUMN `userId` VARCHAR(191) NULL;
UPDATE `system_commission_records` SET `userId` = `vendorId` WHERE `vendorId` IS NOT NULL;
ALTER TABLE `system_commission_records` DROP COLUMN `vendorId`;
ALTER TABLE `system_commission_records` MODIFY COLUMN `userId` VARCHAR(191) NOT NULL;

-- Step 11: vendor_otps
ALTER TABLE `vendor_otps` ADD COLUMN `userId` VARCHAR(191) NULL;
UPDATE `vendor_otps` vo INNER JOIN `vendors` v ON vo.`vendorId` = v.`id` SET vo.`userId` = v.`id`;
ALTER TABLE `vendor_otps` DROP FOREIGN KEY `vendor_otps_vendorId_fkey`;
ALTER TABLE `vendor_otps` DROP COLUMN `vendorId`;
ALTER TABLE `vendor_otps` ADD CONSTRAINT `vendor_otps_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 12: Add vendor_profiles FK
ALTER TABLE `vendor_profiles` ADD CONSTRAINT `vendor_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 13: Drop vendors table
DROP TABLE `vendors`;
