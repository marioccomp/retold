-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "featuredTagIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "manualTagIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
