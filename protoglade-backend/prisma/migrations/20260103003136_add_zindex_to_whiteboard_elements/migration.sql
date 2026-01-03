-- AlterTable
ALTER TABLE "WhiteboardImage" ADD COLUMN     "zIndex" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WhiteboardShape" ADD COLUMN     "zIndex" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WhiteboardStickyNote" ADD COLUMN     "zIndex" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WhiteboardText" ADD COLUMN     "zIndex" INTEGER NOT NULL DEFAULT 0;
