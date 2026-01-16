-- CreateTable
CREATE TABLE "RepositoryAnalysis" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "appType" TEXT NOT NULL,
    "stack" JSONB NOT NULL,
    "structure" JSONB,
    "signals" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepositoryAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RepositoryAnalysis_projectId_key" ON "RepositoryAnalysis"("projectId");

-- AddForeignKey
ALTER TABLE "RepositoryAnalysis" ADD CONSTRAINT "RepositoryAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
