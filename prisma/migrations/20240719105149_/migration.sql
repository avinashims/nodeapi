/*
  Warnings:

  - You are about to alter the column `content` on the `about_us` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.

*/
-- AlterTable
ALTER TABLE `about_us` MODIFY `content` JSON NOT NULL;
