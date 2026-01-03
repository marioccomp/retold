-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PENDING', 'ANALYZING', 'DONE', 'ERROR');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'PENDING';
