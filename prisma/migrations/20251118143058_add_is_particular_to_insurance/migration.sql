-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InsuranceCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "discount" BOOLEAN NOT NULL DEFAULT false,
    "isParticular" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_InsuranceCompany" ("code", "createdAt", "discount", "displayName", "id", "name", "notes", "updatedAt") SELECT "code", "createdAt", "discount", "displayName", "id", "name", "notes", "updatedAt" FROM "InsuranceCompany";
DROP TABLE "InsuranceCompany";
ALTER TABLE "new_InsuranceCompany" RENAME TO "InsuranceCompany";
CREATE UNIQUE INDEX "InsuranceCompany_code_key" ON "InsuranceCompany"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
