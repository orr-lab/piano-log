/*
  Warnings:

  - Made the column `userId` on table `Recording` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Recording" ALTER COLUMN "userId" SET NOT NULL;
