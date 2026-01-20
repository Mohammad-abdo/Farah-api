-- AlterTable
ALTER TABLE `permissions` ADD COLUMN `descriptionAr` VARCHAR(191) NULL,
    ADD COLUMN `nameAr` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `reviews` ADD COLUMN `commentAr` TEXT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `locationAr` VARCHAR(191) NULL,
    ADD COLUMN `nameAr` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `about` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `contentAr` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `privacy` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `contentAr` TEXT NOT NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '1.0',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `terms` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `titleAr` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `contentAr` TEXT NOT NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '1.0',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sliders` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `titleAr` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `descriptionAr` TEXT NULL,
    `image` VARCHAR(191) NOT NULL,
    `link` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_settings` (
    `id` VARCHAR(191) NOT NULL,
    `appName` VARCHAR(191) NOT NULL,
    `appNameAr` VARCHAR(191) NOT NULL,
    `appLogo` VARCHAR(191) NULL,
    `dashboardLogo` VARCHAR(191) NULL,
    `favicon` VARCHAR(191) NULL,
    `primaryColor` VARCHAR(191) NULL DEFAULT '#2d2871',
    `secondaryColor` VARCHAR(191) NULL DEFAULT '#1f1a5a',
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `addressAr` VARCHAR(191) NULL,
    `facebookUrl` VARCHAR(191) NULL,
    `twitterUrl` VARCHAR(191) NULL,
    `instagramUrl` VARCHAR(191) NULL,
    `linkedinUrl` VARCHAR(191) NULL,
    `playStoreUrl` VARCHAR(191) NULL,
    `appStoreUrl` VARCHAR(191) NULL,
    `shareMessage` TEXT NULL,
    `shareMessageAr` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
