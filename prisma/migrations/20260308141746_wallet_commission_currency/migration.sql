-- AlterTable
ALTER TABLE `app_settings` ADD COLUMN `commissionType` VARCHAR(191) NULL DEFAULT 'PERCENTAGE',
    ADD COLUMN `commissionValue` DOUBLE NULL DEFAULT 10,
    ADD COLUMN `currencyCode` VARCHAR(191) NULL DEFAULT 'KWD',
    ADD COLUMN `currencyDecimals` INTEGER NULL DEFAULT 3,
    ADD COLUMN `currencyName` VARCHAR(191) NULL DEFAULT 'Kuwaiti Dinar',
    ADD COLUMN `currencyPosition` VARCHAR(191) NULL DEFAULT 'AFTER',
    ADD COLUMN `currencySymbol` VARCHAR(191) NULL DEFAULT 'KWD';

-- AlterTable
ALTER TABLE `vendor_orders` MODIFY `address` TEXT NULL;

-- AlterTable
ALTER TABLE `vendor_transactions` ADD COLUMN `category` ENUM('ORDER_INCOME', 'BOOKING_INCOME', 'WITHDRAWAL', 'MANUAL_DEPOSIT', 'COMMISSION_DEDUCTION', 'ADJUSTMENT') NOT NULL DEFAULT 'MANUAL_DEPOSIT',
    ADD COLUMN `commission` DOUBLE NULL,
    ADD COLUMN `netAmount` DOUBLE NULL,
    ADD COLUMN `paymentMethod` VARCHAR(191) NULL,
    ADD COLUMN `referenceOrderId` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('COMPLETED', 'PENDING', 'FAILED') NOT NULL DEFAULT 'COMPLETED',
    MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `vendor_wallets` ADD COLUMN `isFrozen` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `pendingBalance` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `totalCommissionPaid` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `totalEarnings` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `totalWithdrawn` DOUBLE NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `system_commission_records` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `orderAmount` DOUBLE NOT NULL,
    `commissionAmount` DOUBLE NOT NULL,
    `vendorEarnings` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
