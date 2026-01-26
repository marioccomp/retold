-- CreateTable
CREATE TABLE "UserProjectStats" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "commitsCount" INTEGER NOT NULL DEFAULT 0,
    "linesAdded" INTEGER NOT NULL DEFAULT 0,
    "linesDeleted" INTEGER NOT NULL DEFAULT 0,
    "ownership" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstCommitDate" TIMESTAMP(3),
    "lastCommitDate" TIMESTAMP(3),
    "activeDays" INTEGER NOT NULL DEFAULT 0,
    "impactScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProjectStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserProjectStats_userId_idx" ON "UserProjectStats"("userId");

-- CreateIndex
CREATE INDEX "UserProjectStats_projectId_idx" ON "UserProjectStats"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProjectStats_userId_projectId_key" ON "UserProjectStats"("userId", "projectId");

-- AddForeignKey
ALTER TABLE "UserProjectStats" ADD CONSTRAINT "UserProjectStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProjectStats" ADD CONSTRAINT "UserProjectStats_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
