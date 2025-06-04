-- AlterTable
ALTER TABLE `carts` ADD COLUMN `wishlistId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `carts` ADD CONSTRAINT `carts_wishlistId_fkey` FOREIGN KEY (`wishlistId`) REFERENCES `wishlists`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
