-- CreateTable
CREATE TABLE "WhiteboardStickyNote" (
    "id" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "content" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#fef08a',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "WhiteboardStickyNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhiteboardStickyNote_projectId_idx" ON "WhiteboardStickyNote"("projectId");

-- AddForeignKey
ALTER TABLE "WhiteboardStickyNote" ADD CONSTRAINT "WhiteboardStickyNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

