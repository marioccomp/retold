/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Certification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Certification" DROP COLUMN "imageUrl",
ADD COLUMN     "image" TEXT;
