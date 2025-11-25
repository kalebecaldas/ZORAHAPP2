import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get current directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path to clinicData.json (adjusting relative path from src/services to src/data)
const DATA_PATH = path.resolve(__dirname, '../data/clinicData.json')

export interface ClinicData {
    name: string
    businessHours: {
        weekdays: string
        saturday: string
        sunday: string
    }
    insurance: string[]
    discountInsurance: string[]
    procedures: Procedure[]
    units: ClinicUnit[]
}

export interface Procedure {
    id: string
    name: string
    description: string
    duration: number
    availableUnits: string[]
    prices: Record<string, number | null | { twiceWeek: number, threeWeek: number, singleSession: number }>
    packages: Record<string, Package[]>
    convenios: string[]
}

export interface Package {
    sessions: number
    price: number
}

export interface ClinicUnit {
    id: string
    name: string
    mapsUrl: string
    phone: string
}

class ClinicDataService {
    private data: ClinicData | null = null
    private lastRead: number = 0
    private readonly CACHE_TTL = 60000 // 1 minute cache

    private loadData(): ClinicData {
        // Check cache
        if (this.data && (Date.now() - this.lastRead < this.CACHE_TTL)) {
            return this.data
        }

        try {
            if (!fs.existsSync(DATA_PATH)) {
                console.error(`❌ ClinicData file not found at: ${DATA_PATH}`)
                throw new Error('Clinic data file not found')
            }

            const fileContent = fs.readFileSync(DATA_PATH, 'utf-8')
            this.data = JSON.parse(fileContent)
            this.lastRead = Date.now()
            console.log('✅ Clinic data loaded successfully')
            return this.data!
        } catch (error) {
            console.error('❌ Error loading clinic data:', error)
            throw error
        }
    }

    getClinicData(): ClinicData {
        return this.loadData()
    }

    getProcedures(): Procedure[] {
        return this.loadData().procedures
    }

    getProcedureById(id: string): Procedure | undefined {
        return this.loadData().procedures.find(p => p.id === id)
    }

    getInsurances(): string[] {
        return this.loadData().insurance
    }

    getUnits(): ClinicUnit[] {
        return this.loadData().units
    }

    getUnitById(id: string): ClinicUnit | undefined {
        return this.loadData().units.find(u => u.id === id)
    }

    // Helper to check if a procedure is covered by an insurance
    isProcedureCovered(procedureId: string, insuranceName: string): boolean {
        const procedure = this.getProcedureById(procedureId)
        if (!procedure) return false

        // Normalize strings for comparison
        const normInsurance = insuranceName.toUpperCase().trim()
        return procedure.convenios.some(c => c.toUpperCase().trim() === normInsurance)
    }

    // Helper to get price for a procedure at a specific unit
    getPrice(procedureId: string, unitId: string): number | string | null {
        const procedure = this.getProcedureById(procedureId)
        if (!procedure) return null

        const price = procedure.prices[unitId]
        if (price === undefined || price === null) return null

        if (typeof price === 'object') {
            return `Sessão avulsa: R$ ${price.singleSession}`
        }


        return price
    }

    getProceduresByInsurance(insuranceName: string): Procedure[] {
        const normInsurance = insuranceName.toUpperCase().trim()
        if (normInsurance === 'PARTICULAR') {
            return this.getProcedures()
        }
        return this.getProcedures().filter(p =>
            p.convenios.some(c => c.toUpperCase().trim() === normInsurance)
        )
    }
}

export const clinicDataService = new ClinicDataService()
