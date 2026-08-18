-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "status" TEXT NOT NULL DEFAULT 'New',
    "dueDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "requesterId" TEXT,
    "ownerUserId" TEXT NOT NULL,
    CONSTRAINT "Task_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Requester" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("createdAt", "description", "dueDate", "id", "ownerUserId", "priority", "requesterId", "status", "title", "updatedAt") SELECT "createdAt", "description", "dueDate", "id", "ownerUserId", "priority", "requesterId", "status", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_ownerUserId_idx" ON "Task"("ownerUserId");
CREATE INDEX "Task_requesterId_idx" ON "Task"("requesterId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
