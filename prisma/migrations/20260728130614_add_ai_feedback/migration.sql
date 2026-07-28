-- AlterTable
ALTER TABLE "Recording" ADD COLUMN     "aiFeedback" TEXT,
ADD COLUMN     "aiFeedbackAt" TIMESTAMP(3),
ADD COLUMN     "aiRating" INTEGER;
