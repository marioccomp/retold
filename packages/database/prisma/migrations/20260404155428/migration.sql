/*
  Warnings:

  - You are about to drop the column `featuredTagIds` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `manualTagIds` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "featuredTagIds",
DROP COLUMN "manualTagIds";
