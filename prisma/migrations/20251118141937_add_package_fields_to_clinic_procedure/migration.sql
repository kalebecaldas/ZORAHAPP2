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
    "openingHours" JSONB NOT NULL,
    "coordinates" JSONB,
    "specialties" JSONB NOT NULL,
    "parkingAvailable" BOOLEAN NOT NULL DEFAULT false,
    "accessibility" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClinicInsurance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "insuranceCode" TEXT NOT NULL,
    "coveragePercentage" REAL NOT NULL DEFAULT 70,
    "copayment" REAL NOT NULL DEFAULT 0,
    "requiresPreAuthorization" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClinicInsurance_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClinicProcedure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "procedureCode" TEXT NOT NULL,
    "particularPrice" REAL NOT NULL,
    "insurancePrice" JSONB NOT NULL,
    "hasPackage" BOOLEAN NOT NULL DEFAULT false,
    "packageInfo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClinicProcedure_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_code_key" ON "Clinic"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicInsurance_clinicId_insuranceCode_key" ON "ClinicInsurance"("clinicId", "insuranceCode");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicProcedure_clinicId_procedureCode_key" ON "ClinicProcedure"("clinicId", "procedureCode");
