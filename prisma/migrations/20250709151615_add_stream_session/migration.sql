/*
  Warnings:

  - You are about to drop the column `extractedId` on the `Stream` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Stream` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Stream" DROP CONSTRAINT "Stream_userId_fkey";

-- AlterTable
ALTER TABLE "Stream" DROP COLUMN "extractedId",
DROP COLUMN "userId",
ADD COLUMN     "sessionId" TEXT;

-- CreateTable
CREATE TABLE "StreamSession" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StreamSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StreamSession_code_key" ON "StreamSession"("code");

-- AddForeignKey
ALTER TABLE "StreamSession" ADD CONSTRAINT "StreamSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StreamSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
