/*
  Warnings:

  - A unique constraint covering the columns `[userId,streamId]` on the table `Upvote` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bigImg` to the `Stream` table without a default value. This is not possible if the table is not empty.
  - Added the required column `smallImg` to the `Stream` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Stream` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Stream" ADD COLUMN     "bigImg" TEXT NOT NULL,
ADD COLUMN     "smallImg" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Upvote_userId_streamId_key" ON "Upvote"("userId", "streamId");
