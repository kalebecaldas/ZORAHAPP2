-- CreateTable
CREATE TABLE "ClinicProcedure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "procedureCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "defaultPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClinicProcedure_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicProcedure_procedureCode_fkey" FOREIGN KEY ("procedureCode") REFERENCES "Procedure" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ClinicProcedure_clinicId_idx" ON "ClinicProcedure"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicProcedure_procedureCode_idx" ON "ClinicProcedure"("procedureCode");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicProcedure_clinicId_procedureCode_key" ON "ClinicProcedure"("clinicId", "procedureCode");
