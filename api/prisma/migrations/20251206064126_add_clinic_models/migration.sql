-- CreateTable
CREATE TABLE "InsuranceCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "discount" BOOLEAN NOT NULL DEFAULT false,
    "discountPercentage" REAL DEFAULT 0,
    "isParticular" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Procedure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "importantInfo" TEXT,
    "basePrice" REAL NOT NULL,
    "requiresEvaluation" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER NOT NULL,
    "categories" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "openingHours" TEXT NOT NULL,
    "coordinates" TEXT,
    "specialties" TEXT NOT NULL,
    "parkingAvailable" BOOLEAN NOT NULL DEFAULT false,
    "accessibility" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClinicInsurance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "insuranceCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClinicInsurance_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicInsurance_insuranceCode_fkey" FOREIGN KEY ("insuranceCode") REFERENCES "InsuranceCompany" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

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

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceCompany_code_key" ON "InsuranceCompany"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Procedure_code_key" ON "Procedure"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_code_key" ON "Clinic"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicInsurance_clinicId_insuranceCode_key" ON "ClinicInsurance"("clinicId", "insuranceCode");

-- CreateIndex
CREATE INDEX "ClinicProcedure_clinicId_idx" ON "ClinicProcedure"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicProcedure_procedureCode_idx" ON "ClinicProcedure"("procedureCode");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicProcedure_clinicId_procedureCode_key" ON "ClinicProcedure"("clinicId", "procedureCode");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicInsuranceProcedure_clinicId_insuranceCode_procedureCode_key" ON "ClinicInsuranceProcedure"("clinicId", "insuranceCode", "procedureCode");
