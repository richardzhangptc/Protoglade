-- CreateTable
CREATE TABLE "WhiteboardText" (
    "id" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 32,
    "content" TEXT NOT NULL DEFAULT '',
    "fontSize" INTEGER NOT NULL DEFAULT 16,
    "fontWeight" TEXT NOT NULL DEFAULT 'normal',
    "color" TEXT NOT NULL DEFAULT '#000000',
    "align" TEXT NOT NULL DEFAULT 'left',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "WhiteboardText_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhiteboardText_projectId_idx" ON "WhiteboardText"("projectId");

-- AddForeignKey
ALTER TABLE "WhiteboardText" ADD CONSTRAINT "WhiteboardText_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;


