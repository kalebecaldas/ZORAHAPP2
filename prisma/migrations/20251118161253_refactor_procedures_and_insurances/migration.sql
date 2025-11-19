/*
  Warnings:

  - You are about to drop the `ClinicProcedure` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InsuranceProcedure` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `copayment` on the `ClinicInsurance` table. All the data in the column will be lost.
  - You are about to drop the column `coveragePercentage` on the `ClinicInsurance` table. All the data in the column will be lost.
  - You are about to drop the column `requiresPreAuthorization` on the `ClinicInsurance` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ClinicProcedure_clinicId_procedureCode_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ClinicProcedure";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "InsuranceProcedure";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ClinicInsuranceProcedure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "insuranceCode" TEXT NOT NULL,
    "procedureCode" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "hasPackage" BOOLEAN NOT NULL DEFAULT false,
    "packageInfo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClinicInsuranceProcedure_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicInsuranceProcedure_insuranceCode_fkey" FOREIGN KEY ("insuranceCode") REFERENCES "InsuranceCompany" ("code") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicInsuranceProcedure_procedureCode_fkey" FOREIGN KEY ("procedureCode") REFERENCES "Procedure" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClinicInsurance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "insuranceCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClinicInsurance_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicInsurance_insuranceCode_fkey" FOREIGN KEY ("insuranceCode") REFERENCES "InsuranceCompany" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ClinicInsurance" ("clinicId", "createdAt", "id", "insuranceCode", "isActive", "updatedAt") SELECT "clinicId", "createdAt", "id", "insuranceCode", "isActive", "updatedAt" FROM "ClinicInsurance";
DROP TABLE "ClinicInsurance";
ALTER TABLE "new_ClinicInsurance" RENAME TO "ClinicInsurance";
CREATE UNIQUE INDEX "ClinicInsurance_clinicId_insuranceCode_key" ON "ClinicInsurance"("clinicId", "insuranceCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ClinicInsuranceProcedure_clinicId_insuranceCode_procedureCode_key" ON "ClinicInsuranceProcedure"("clinicId", "insuranceCode", "procedureCode");
