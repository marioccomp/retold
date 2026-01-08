-- AlterTable
ALTER TABLE "RepositoryAnalysis" ADD COLUMN "rawAnalysis" JSONB;
ALTER TABLE "RepositoryAnalysis" ADD COLUMN "llmOverview" TEXT;

