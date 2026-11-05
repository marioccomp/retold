-- CreateEnum
CREATE TYPE "AnalysisRunStatus" AS ENUM ('DONE', 'ERROR');

-- CreateEnum
CREATE TYPE "AnalysisClaimKind" AS ENUM ('RESPONSIBILITY', 'PATTERN', 'NOTABLE', 'RISK');

-- CreateEnum
CREATE TYPE "ScoreAxis" AS ENUM ('ARCHITECTURE', 'SECURITY', 'TESTING', 'DEVOPS', 'DOCUMENTATION');

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "pipelineVersion" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "commitSha" TEXT,
    "privacyMode" TEXT NOT NULL,
    "status" "AnalysisRunStatus" NOT NULL,
    "llmCalls" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,6),
    "durationMs" INTEGER,
    "stats" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisClaim" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "kind" "AnalysisClaimKind" NOT NULL,
    "text" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "startLine" INTEGER NOT NULL,
    "endLine" INTEGER NOT NULL,
    "symbol" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AnalysisClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectScore" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "axis" "ScoreAxis" NOT NULL,
    "score" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,

    CONSTRAINT "ProjectScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalysisRun_projectId_createdAt_idx" ON "AnalysisRun"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisClaim_projectId_idx" ON "AnalysisClaim"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisClaim_runId_key_key" ON "AnalysisClaim"("runId", "key");

-- CreateIndex
CREATE INDEX "ProjectScore_projectId_axis_idx" ON "ProjectScore"("projectId", "axis");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectScore_runId_axis_key" ON "ProjectScore"("runId", "axis");

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisClaim" ADD CONSTRAINT "AnalysisClaim_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisClaim" ADD CONSTRAINT "AnalysisClaim_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectScore" ADD CONSTRAINT "ProjectScore_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectScore" ADD CONSTRAINT "ProjectScore_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

