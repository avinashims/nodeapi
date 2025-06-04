/*
  Warnings:

  - Added the required column `sizes` to the `carts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `carts` ADD COLUMN `sizes` VARCHAR(191) NOT NULL;
