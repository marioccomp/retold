/*
  Warnings:

  - Added the required column `issuedAt` to the `Certification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `issuer` to the `Certification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Certification" ADD COLUMN     "credentialUrl" TEXT,
ADD COLUMN     "issuedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "issuer" TEXT NOT NULL;
