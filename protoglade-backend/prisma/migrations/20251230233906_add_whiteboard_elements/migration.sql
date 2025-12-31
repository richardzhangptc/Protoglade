-- CreateTable
CREATE TABLE "WhiteboardStickyNote" (
    "id" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 150,
    "text" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#fef08a',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "WhiteboardStickyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhiteboardTextElement" (
    "id" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "fontSize" INTEGER NOT NULL DEFAULT 16,
    "color" TEXT NOT NULL DEFAULT '#000000',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "WhiteboardTextElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhiteboardShape" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#000000',
    "strokeWidth" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "filled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "WhiteboardShape_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhiteboardStickyNote_projectId_idx" ON "WhiteboardStickyNote"("projectId");

-- CreateIndex
CREATE INDEX "WhiteboardTextElement_projectId_idx" ON "WhiteboardTextElement"("projectId");

-- CreateIndex
CREATE INDEX "WhiteboardShape_projectId_idx" ON "WhiteboardShape"("projectId");

-- AddForeignKey
ALTER TABLE "WhiteboardStickyNote" ADD CONSTRAINT "WhiteboardStickyNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardTextElement" ADD CONSTRAINT "WhiteboardTextElement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardShape" ADD CONSTRAINT "WhiteboardShape_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
