/*
  Warnings:

  - You are about to drop the `AnalysisUsage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AnalysisUsage" DROP CONSTRAINT "AnalysisUsage_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dailyAnalysisCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dailyAnalysisDate" TIMESTAMP(3);

-- DropTable
DROP TABLE "AnalysisUsage";
