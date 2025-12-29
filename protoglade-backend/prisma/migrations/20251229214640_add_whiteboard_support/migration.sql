-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'kanban';

-- CreateTable
CREATE TABLE "WhiteboardStroke" (
    "id" TEXT NOT NULL,
    "points" JSONB NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#000000',
    "size" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "WhiteboardStroke_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhiteboardStroke_projectId_idx" ON "WhiteboardStroke"("projectId");

-- AddForeignKey
ALTER TABLE "WhiteboardStroke" ADD CONSTRAINT "WhiteboardStroke_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
