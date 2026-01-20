-- AlterTable
ALTER TABLE `payments` ADD COLUMN `cardId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `credit_cards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
