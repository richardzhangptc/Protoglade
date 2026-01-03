-- AlterTable - Add columns with proper defaults for existing data
ALTER TABLE "WhiteboardStroke" ADD COLUMN IF NOT EXISTS "zIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WhiteboardStroke" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- Update existing rows to have updatedAt set to createdAt
UPDATE "WhiteboardStroke" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Now make updatedAt NOT NULL
ALTER TABLE "WhiteboardStroke" ALTER COLUMN "updatedAt" SET NOT NULL;
