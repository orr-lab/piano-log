-- AlterTable
ALTER TABLE "User" DROP COLUMN "label",
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AlterTable
ALTER TABLE "LoginAttempt" ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "LoginAttempt_username_createdAt_idx" ON "LoginAttempt"("username", "createdAt");
