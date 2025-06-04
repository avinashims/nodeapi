/*
  Warnings:

  - You are about to alter the column `answer` on the `faqs` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.

*/
-- AlterTable
ALTER TABLE `faqs` MODIFY `answer` JSON NOT NULL;
