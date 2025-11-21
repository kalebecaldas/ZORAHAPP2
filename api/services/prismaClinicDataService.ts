import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const prismaClinicDataService = {
    async getProcedures() {
        const procedures = await prisma.procedure.findMany({
            include: {
                offeredBy: true
            }
        })

        // Map to format expected by bot
        return procedures.map(p => ({
            id: p.code,
            name: p.name,
            description: p.description,
            basePrice: p.basePrice,
            duration: p.duration,
            requiresEvaluation: p.requiresEvaluation,
            categories: typeof p.categories === 'string' ? JSON.parse(p.categories) : p.categories,
            insuranceAccepted: [] // Populated dynamically if needed
        }))
    },

    async getInsuranceCompanies() {
        const insurances = await prisma.insuranceCompany.findMany()
        return insurances.map(i => ({
            id: i.code,
            name: i.name,
            displayName: i.displayName,
            coveragePercentage: 0, // Default, logic might differ in DB
            copayment: 0,
            requiresPreAuthorization: false,
            procedures: [] // Populated dynamically
        }))
    },

    async getLocations() {
        const clinics = await prisma.clinic.findMany()
        return clinics.map(c => ({
            id: c.code,
            name: c.name,
            address: c.address,
            neighborhood: c.neighborhood,
            phone: c.phone,
            openingHours: typeof c.openingHours === 'string' ? JSON.parse(c.openingHours) : c.openingHours,
            mapUrl: '' // Add if available in schema
        }))
    },

    async getProcedureById(id: string) {
        const procedure = await prisma.procedure.findUnique({
            where: { code: id }
        })
        if (!procedure) return null

        return {
            id: procedure.code,
            name: procedure.name,
            description: procedure.description,
            basePrice: procedure.basePrice,
            duration: procedure.duration,
            requiresEvaluation: procedure.requiresEvaluation,
            categories: typeof procedure.categories === 'string' ? JSON.parse(procedure.categories) : procedure.categories,
            insuranceAccepted: []
        }
    },

    async calculatePrice(procedureCode: string, insuranceCode?: string, locationCode?: string) {
        // 1. Try to find specific price for clinic + insurance + procedure
        if (locationCode && insuranceCode) {
            const cip = await prisma.clinicInsuranceProcedure.findUnique({
                where: {
                    clinicId_insuranceCode_procedureCode: {
                        clinicId: await this.getClinicIdByCode(locationCode),
                        insuranceCode: insuranceCode,
                        procedureCode: procedureCode
                    }
                },
                include: { insurance: true }
            })

            if (cip) {
                return {
                    basePrice: cip.price,
                    patientPays: cip.price, // Assuming price in DB is what patient pays or base for calc
                    description: cip.hasPackage ? cip.packageInfo : undefined
                }
            }
        }

        // 2. If no specific price, try generic insurance price (if we had it, but we don't in new model)
        // In new model, prices are always tied to clinic.

        // 3. Fallback to ClinicProcedure (offered price)
        if (locationCode) {
            const cp = await prisma.clinicProcedure.findUnique({
                where: {
                    clinicId_procedureCode: {
                        clinicId: await this.getClinicIdByCode(locationCode),
                        procedureCode: procedureCode
                    }
                }
            })

            if (cp && cp.defaultPrice) {
                return {
                    basePrice: cp.defaultPrice,
                    patientPays: cp.defaultPrice
                }
            }
        }

        // 4. Fallback to base price
        const procedure = await prisma.procedure.findUnique({ where: { code: procedureCode } })
        return procedure ? { basePrice: procedure.basePrice, patientPays: procedure.basePrice } : null
    },

    // Helper to get internal ID from code
    async getClinicIdByCode(code: string): Promise<string> {
        const clinic = await prisma.clinic.findUnique({ where: { code } })
        return clinic ? clinic.id : ''
    }
}
