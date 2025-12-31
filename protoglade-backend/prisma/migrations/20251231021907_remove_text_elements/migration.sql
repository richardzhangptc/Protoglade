/*
  Warnings:

  - You are about to drop the `WhiteboardTextElement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WhiteboardTextElement" DROP CONSTRAINT "WhiteboardTextElement_projectId_fkey";

-- DropTable
DROP TABLE "WhiteboardTextElement";
