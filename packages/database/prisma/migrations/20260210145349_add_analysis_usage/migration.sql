-- CreateTable
CREATE TABLE "AnalysisUsage" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnalysisUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalysisUsage_userId_idx" ON "AnalysisUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisUsage_userId_date_key" ON "AnalysisUsage"("userId", "date");

-- AddForeignKey
ALTER TABLE "AnalysisUsage" ADD CONSTRAINT "AnalysisUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
