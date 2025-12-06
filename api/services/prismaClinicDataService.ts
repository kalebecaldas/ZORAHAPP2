import prisma from '../prisma/client.js'

export const prismaClinicDataService = {
    async getProcedures() {
        const procedures = await prisma.procedure.findMany({
            include: {
                offeredBy: true,
                clinicProcedures: {
                    include: {
                        clinic: true
                    }
                }
            }
        })

        // Map to format expected by bot
        return procedures.map(p => {
            // Buscar pacotes de todas as clínicas que oferecem este procedimento
            const packages: any[] = []

            for (const cp of p.clinicProcedures) {
                if (cp.hasPackage && cp.packageInfo) {
                    try {
                        const packageData = typeof cp.packageInfo === 'string'
                            ? JSON.parse(cp.packageInfo)
                            : cp.packageInfo

                        if (Array.isArray(packageData)) {
                            packages.push(...packageData)
                        }
                    } catch (e) {
                        // Silenciosamente ignora packageInfo em formato inválido (texto puro)
                        // Isso acontece quando o usuário digitou texto ao invés de JSON
                    }
                }
            }

            return {
                id: p.code,
                name: p.name,
                description: p.description,
                basePrice: p.basePrice,
                duration: p.duration,
                requiresEvaluation: p.requiresEvaluation,
                categories: typeof p.categories === 'string' ? JSON.parse(p.categories) : p.categories,
                packages: packages.length > 0 ? packages : undefined, // ✅ NOVO: Incluir pacotes
                insuranceAccepted: [] // Populated dynamically if needed
            }
        })
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
    },

    /**
     * Busca clínica por nome (case-insensitive)
     */
    async getClinicByName(name: string) {
        const clinic = await prisma.clinic.findFirst({
            where: {
                OR: [
                    { name: { contains: name, mode: 'insensitive' } },
                    { displayName: { contains: name, mode: 'insensitive' } }
                ],
                isActive: true
            }
        })

        if (!clinic) return null

        return {
            id: clinic.code,
            name: clinic.name,
            displayName: clinic.displayName,
            address: clinic.address,
            neighborhood: clinic.neighborhood,
            city: clinic.city,
            state: clinic.state,
            phone: clinic.phone,
            email: clinic.email,
            openingHours: typeof clinic.openingHours === 'string' ? JSON.parse(clinic.openingHours) : clinic.openingHours,
            coordinates: typeof clinic.coordinates === 'string' ? JSON.parse(clinic.coordinates) : clinic.coordinates,
            specialties: typeof clinic.specialties === 'string' ? JSON.parse(clinic.specialties) : clinic.specialties,
            parkingAvailable: clinic.parkingAvailable,
            accessibility: typeof clinic.accessibility === 'string' ? JSON.parse(clinic.accessibility) : clinic.accessibility
        }
    },

    /**
     * Busca todos os procedimentos de uma clínica com um convênio específico
     */
    async getProceduresByClinicAndInsurance(clinicCode: string, insuranceCode: string) {
        const clinicId = await this.getClinicIdByCode(clinicCode)
        if (!clinicId) return []

        const procedures = await prisma.clinicInsuranceProcedure.findMany({
            where: {
                clinicId,
                insuranceCode,
                isActive: true
            },
            include: {
                procedure: true,
                insurance: true
            }
        })

        return procedures.map(p => ({
            id: p.procedure.code,
            name: p.procedure.name,
            description: p.procedure.description,
            price: p.price,
            hasPackage: p.hasPackage,
            packageInfo: p.packageInfo,
            duration: p.procedure.duration,
            requiresEvaluation: p.procedure.requiresEvaluation
        }))
    },

    /**
     * Busca informações de pacote para um procedimento específico
     */
    async getPackageInfo(clinicCode: string, procedureCode: string, insuranceCode: string = 'PARTICULAR') {
        const clinicId = await this.getClinicIdByCode(clinicCode)
        if (!clinicId) return null

        const packageData = await prisma.clinicInsuranceProcedure.findFirst({
            where: {
                clinicId,
                procedureCode,
                insuranceCode,
                hasPackage: true,
                isActive: true
            },
            include: {
                procedure: true
            }
        })

        if (!packageData) return null

        return {
            procedureName: packageData.procedure.name,
            regularPrice: packageData.price,
            hasPackage: packageData.hasPackage,
            packageInfo: packageData.packageInfo,
            packageDescription: packageData.packageInfo
        }
    },

    /**
     * Busca todas as clínicas ativas
     */
    async getAllClinics() {
        const clinics = await prisma.clinic.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        })

        return clinics.map(c => ({
            id: c.code,
            name: c.name,
            displayName: c.displayName,
            address: c.address,
            neighborhood: c.neighborhood,
            city: c.city,
            state: c.state,
            phone: c.phone,
            email: c.email,
            openingHours: typeof c.openingHours === 'string' ? JSON.parse(c.openingHours) : c.openingHours,
            coordinates: typeof c.coordinates === 'string' ? JSON.parse(c.coordinates) : c.coordinates,
            specialties: typeof c.specialties === 'string' ? JSON.parse(c.specialties) : c.specialties
        }))
    },

    /**
     * Busca todos os procedimentos oferecidos por uma clínica
     */
    async getProceduresByClinic(clinicCode: string) {
        const clinicId = await this.getClinicIdByCode(clinicCode)
        if (!clinicId) return []

        // Buscar procedimentos com preços particulares
        const procedures = await prisma.clinicInsuranceProcedure.findMany({
            where: {
                clinicId,
                insuranceCode: 'PARTICULAR',
                isActive: true
            },
            include: {
                procedure: true
            },
            orderBy: {
                procedure: { name: 'asc' }
            }
        })

        return procedures.map(p => {
            // Parse packageInfo se existir
            let packages = undefined
            if (p.hasPackage && p.packageInfo) {
                try {
                    const packageData = typeof p.packageInfo === 'string'
                        ? JSON.parse(p.packageInfo)
                        : p.packageInfo

                    if (Array.isArray(packageData)) {
                        packages = packageData
                    }
                } catch (e) {
                    // Silenciosamente ignora packageInfo em formato inválido
                }
            }

            return {
                id: p.procedure.code,
                name: p.procedure.name,
                description: p.procedure.description,
                price: p.price,
                hasPackage: p.hasPackage,
                packages, // ✅ Retornar array de pacotes parseado
                duration: p.procedure.duration,
                requiresEvaluation: p.procedure.requiresEvaluation,
                importantInfo: p.procedure.importantInfo
            }
        })
    },

    /**
     * Busca convênios aceitos por uma clínica
     */
    async getInsurancesByClinic(clinicCode: string) {
        const clinicId = await this.getClinicIdByCode(clinicCode)
        if (!clinicId) return []

        // Buscar convênios únicos que têm procedimentos nesta clínica
        const insurances = await prisma.clinicInsuranceProcedure.findMany({
            where: {
                clinicId,
                isActive: true
            },
            include: {
                insurance: true
            },
            distinct: ['insuranceCode']
        })

        return insurances
            .filter(i => !i.insurance.isParticular) // Excluir "PARTICULAR"
            .map(i => ({
                id: i.insurance.code,
                name: i.insurance.name,
                displayName: i.insurance.displayName,
                discount: i.insurance.discount,
                discountPercentage: i.insurance.discountPercentage
            }))
    }
}
