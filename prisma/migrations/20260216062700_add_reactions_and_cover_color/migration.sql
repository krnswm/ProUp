-- AlterTable
ALTER TABLE "Task" ADD COLUMN "coverColor" TEXT;

-- CreateTable
CREATE TABLE "TaskReaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskReaction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TaskReaction_taskId_idx" ON "TaskReaction"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskReaction_taskId_userId_emoji_key" ON "TaskReaction"("taskId", "userId", "emoji");
