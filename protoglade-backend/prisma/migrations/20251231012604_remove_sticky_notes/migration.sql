/*
  Warnings:

  - You are about to drop the `WhiteboardStickyNote` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WhiteboardStickyNote" DROP CONSTRAINT "WhiteboardStickyNote_projectId_fkey";

-- DropTable
DROP TABLE "WhiteboardStickyNote";
