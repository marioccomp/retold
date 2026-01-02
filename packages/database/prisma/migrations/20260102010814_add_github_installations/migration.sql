-- CreateTable
CREATE TABLE "GithubAppInstallation" (
    "id" SERIAL NOT NULL,
    "installationId" TEXT NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubAppInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GithubAppInstallation_installationId_key" ON "GithubAppInstallation"("installationId");

-- CreateIndex
CREATE INDEX "GithubAppInstallation_userId_idx" ON "GithubAppInstallation"("userId");

-- AddForeignKey
ALTER TABLE "GithubAppInstallation" ADD CONSTRAINT "GithubAppInstallation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
