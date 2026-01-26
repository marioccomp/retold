-- CreateTable
CREATE TABLE "GithubStats" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastCommit" JSONB,
    "totalStars" INTEGER NOT NULL,
    "totalRepositories" INTEGER NOT NULL,
    "totalPRs" INTEGER NOT NULL,
    "topLanguages" JSONB,

    CONSTRAINT "GithubStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GithubStats_userId_key" ON "GithubStats"("userId");

-- AddForeignKey
ALTER TABLE "GithubStats" ADD CONSTRAINT "GithubStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
