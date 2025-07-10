/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,extractedId]` on the table `Stream` will be added. If there are existing duplicate values, this will fail.
  - Made the column `sessionId` on table `Stream` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Stream" DROP CONSTRAINT "Stream_sessionId_fkey";

-- DropIndex
DROP INDEX "Stream_extractedId_key";

-- AlterTable
ALTER TABLE "Stream" ALTER COLUMN "sessionId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Upvote" ADD COLUMN     "isUpvote" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "Stream_sessionId_extractedId_key" ON "Stream"("sessionId", "extractedId");

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StreamSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
