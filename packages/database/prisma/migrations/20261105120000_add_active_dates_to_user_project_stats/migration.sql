-- AlterTable
ALTER TABLE "UserProjectStats" ADD COLUMN     "activeDates" TEXT[] DEFAULT ARRAY[]::TEXT[];
