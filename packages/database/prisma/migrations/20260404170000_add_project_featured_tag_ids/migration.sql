-- AlterTable
ALTER TABLE "Project" ADD COLUMN "featuredTagIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
