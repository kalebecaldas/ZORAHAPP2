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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_InsuranceCompany" ("code", "createdAt", "discount", "displayName", "id", "isParticular", "name", "notes", "updatedAt") SELECT "code", "createdAt", "discount", "displayName", "id", "isParticular", "name", "notes", "updatedAt" FROM "InsuranceCompany";
DROP TABLE "InsuranceCompany";
ALTER TABLE "new_InsuranceCompany" RENAME TO "InsuranceCompany";
CREATE UNIQUE INDEX "InsuranceCompany_code_key" ON "InsuranceCompany"("code");
CREATE TABLE "new_InsuranceProcedure" (
    "insuranceId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "defaultParticularPrice" REAL,
    "defaultPackageInfo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("insuranceId", "procedureId"),
    CONSTRAINT "InsuranceProcedure_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "InsuranceCompany" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InsuranceProcedure_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_InsuranceProcedure" ("createdAt", "insuranceId", "procedureId") SELECT "createdAt", "insuranceId", "procedureId" FROM "InsuranceProcedure";
DROP TABLE "InsuranceProcedure";
ALTER TABLE "new_InsuranceProcedure" RENAME TO "InsuranceProcedure";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
