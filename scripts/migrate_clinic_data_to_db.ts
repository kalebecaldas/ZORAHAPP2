import prisma from '../api/prisma/client.js'
import fs from 'fs'
import path from 'path'

/**
 * Script para migrar dados de infor_clinic.txt para o banco de dados
 * 
 * Migra:
 * - Clínicas (Vieiralves, São José)
 * - Procedimentos
 * - Convênios
 * - Tabela de preços (ClinicInsuranceProcedure)
 */

interface ProcedureData {
    code: string
    name: string
    description: string
    basePrice: number
    duration: number
    requiresEvaluation: boolean
}

interface InsuranceData {
    code: string
    name: string
    displayName: string
    discount: boolean
    discountPercentage: number
    isParticular: boolean
}

interface ClinicData {
    code: string
    name: string
    displayName: string
    address: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
    phone: string
    mapUrl: string
}

interface PriceData {
    clinicCode: string
    insuranceCode: string
    procedureCode: string
    price: number
    hasPackage: boolean
    packageInfo?: string
}

async function migrateClinicData() {
    console.log('🚀 Iniciando migração de dados da clínica...\n')

    try {
        // 1. CRIAR CLÍNICAS
        console.log('📍 Criando clínicas...')

        const vieiralves = await prisma.clinic.upsert({
            where: { code: 'VIEIRALVES' },
            update: {},
            create: {
                code: 'VIEIRALVES',
                name: 'Unidade Vieiralves',
                displayName: 'Vieiralves',
                address: 'Rua Vieiralves, 1230',
                neighborhood: 'Vieiralves',
                city: 'Manaus',
                state: 'AM',
                zipCode: '69000-000',
                phone: '(92) 3234-5678',
                email: 'vieiralves@iaam.com.br',
                openingHours: {
                    'Segunda-Sexta': '07:30-19:30',
                    'Sábado': '08:00-12:00'
                },
                coordinates: {
                    lat: -3.1190275,
                    lng: -60.0217314
                },
                specialties: ['Fisioterapia', 'Acupuntura', 'RPG', 'Pilates', 'Quiropraxia'],
                parkingAvailable: true,
                accessibility: {
                    wheelchairAccess: true,
                    elevator: true
                },
                isActive: true
            }
        })
        console.log(`✅ Clínica Vieiralves criada: ${vieiralves.id}`)

        const saoJose = await prisma.clinic.upsert({
            where: { code: 'SAO_JOSE' },
            update: {},
            create: {
                code: 'SAO_JOSE',
                name: 'Unidade São José',
                displayName: 'São José',
                address: 'Rua São José, 456',
                neighborhood: 'São José',
                city: 'Manaus',
                state: 'AM',
                zipCode: '69000-000',
                phone: '(92) 3234-9999',
                email: 'saojose@iaam.com.br',
                openingHours: {
                    'Segunda-Sexta': '07:30-18:00',
                    'Sábado': '08:00-12:00'
                },
                coordinates: {
                    lat: -3.1190275,
                    lng: -60.0217314
                },
                specialties: ['Fisioterapia', 'Acupuntura', 'RPG'],
                parkingAvailable: true,
                accessibility: {
                    wheelchairAccess: true
                },
                isActive: true
            }
        })
        console.log(`✅ Clínica São José criada: ${saoJose.id}\n`)

        // 2. CRIAR PROCEDIMENTOS
        console.log('💉 Criando procedimentos...')

        const procedures: ProcedureData[] = [
            {
                code: 'FISIO_ORTOPEDICA',
                name: 'Fisioterapia Ortopédica',
                description: 'Tratamento de lesões musculoesqueléticas, pós-operatório e reabilitação ortopédica',
                basePrice: 90.00,
                duration: 50,
                requiresEvaluation: false
            },
            {
                code: 'FISIO_NEUROLOGICA',
                name: 'Fisioterapia Neurológica',
                description: 'Reabilitação de pacientes com doenças neurológicas (AVC, Parkinson, etc)',
                basePrice: 100.00,
                duration: 50,
                requiresEvaluation: false
            },
            {
                code: 'FISIO_RESPIRATORIA',
                name: 'Fisioterapia Respiratória',
                description: 'Tratamento de doenças respiratórias e reabilitação pulmonar',
                basePrice: 100.00,
                duration: 50,
                requiresEvaluation: false
            },
            {
                code: 'FISIO_PELVICA',
                name: 'Fisioterapia Pélvica',
                description: 'Tratamento de disfunções do assoalho pélvico',
                basePrice: 220.00,
                duration: 50,
                requiresEvaluation: true
            },
            {
                code: 'ACUPUNTURA',
                name: 'Acupuntura',
                description: 'Tratamento através de técnicas de medicina chinesa',
                basePrice: 180.00,
                duration: 50,
                requiresEvaluation: true
            },
            {
                code: 'RPG',
                name: 'RPG',
                description: 'Reeducação Postural Global',
                basePrice: 120.00,
                duration: 50,
                requiresEvaluation: false
            },
            {
                code: 'PILATES',
                name: 'Pilates',
                description: 'Exercícios de fortalecimento e alongamento',
                basePrice: 70.00,
                duration: 50,
                requiresEvaluation: false
            },
            {
                code: 'QUIROPRAXIA',
                name: 'Quiropraxia',
                description: 'Ajustes quiropráticos para alívio de dores',
                basePrice: 120.00,
                duration: 40,
                requiresEvaluation: false
            },
            {
                code: 'CONSULTA_ORTOPEDISTA',
                name: 'Consulta com Ortopedista',
                description: 'Consulta médica ortopédica',
                basePrice: 400.00,
                duration: 30,
                requiresEvaluation: false
            },
            {
                code: 'AVALIACAO_FISIO_PELVICA',
                name: 'Avaliação Fisioterapia Pélvica',
                description: 'Avaliação inicial para fisioterapia pélvica',
                basePrice: 250.00,
                duration: 60,
                requiresEvaluation: false
            },
            {
                code: 'AVALIACAO_ACUPUNTURA',
                name: 'Avaliação Acupuntura',
                description: 'Avaliação inicial para acupuntura',
                basePrice: 200.00,
                duration: 60,
                requiresEvaluation: false
            },
            {
                code: 'INFILTRACAO',
                name: 'Infiltração de ponto gatilho e Agulhamento a seco',
                description: 'Técnica para alívio de dores musculares',
                basePrice: 150.00,
                duration: 40,
                requiresEvaluation: false
            },
            {
                code: 'ESTIMULACAO_ELETRICA',
                name: 'Estimulação Elétrica Transcutânea',
                description: 'TENS para alívio de dores',
                basePrice: 80.00,
                duration: 30,
                requiresEvaluation: false
            },
            {
                code: 'TERAPIA_ONDAS_CHOQUE',
                name: 'Terapias por Ondas de Choque',
                description: 'Tratamento com ondas de choque para lesões',
                basePrice: 200.00,
                duration: 30,
                requiresEvaluation: false
            },
            {
                code: 'FISIO_POS_OPERATORIA',
                name: 'Fisioterapia Pós-operatória',
                description: 'Reabilitação após cirurgias',
                basePrice: 60.00,
                duration: 50,
                requiresEvaluation: false
            },
            {
                code: 'CONSULTA_CLINICO_GERAL',
                name: 'Consulta Clínico Geral',
                description: 'Consulta médica clínica geral',
                basePrice: 200.00,
                duration: 30,
                requiresEvaluation: false
            }
        ]

        for (const proc of procedures) {
            const created = await prisma.procedure.upsert({
                where: { code: proc.code },
                update: {},
                create: {
                    code: proc.code,
                    name: proc.name,
                    description: proc.description,
                    importantInfo: proc.requiresEvaluation ? 'Requer avaliação prévia' : null,
                    basePrice: proc.basePrice,
                    requiresEvaluation: proc.requiresEvaluation,
                    duration: proc.duration,
                    categories: ['Fisioterapia']
                }
            })
            console.log(`✅ Procedimento criado: ${created.name}`)
        }
        console.log('')

        // 3. CRIAR CONVÊNIOS
        console.log('🏥 Criando convênios...')

        const insurances: InsuranceData[] = [
            { code: 'BRADESCO', name: 'BRADESCO', displayName: 'Bradesco', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'SULAMERICA', name: 'SULAMÉRICA', displayName: 'SulAmérica', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'MEDISERVICE', name: 'MEDISERVICE', displayName: 'Mediservice', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'SAUDE_CAIXA', name: 'SAÚDE CAIXA', displayName: 'Saúde Caixa', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'PETROBRAS', name: 'PETROBRAS', displayName: 'Petrobras', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'GEAP', name: 'GEAP', displayName: 'GEAP', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'PRO_SOCIAL', name: 'PRO SOCIAL', displayName: 'Pro Social', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'POSTAL_SAUDE', name: 'POSTAL SAÚDE', displayName: 'Postal Saúde', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'CONAB', name: 'CONAB', displayName: 'CONAB', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'AFFEAM', name: 'AFFEAM', displayName: 'AFFEAM', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'AMBEP', name: 'AMBEP', displayName: 'AMBEP', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'GAMA', name: 'GAMA', displayName: 'GAMA', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'LIFE', name: 'LIFE', displayName: 'Life', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'NOTREDAME', name: 'NOTREDAME', displayName: 'NotreDame', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'OAB', name: 'OAB', displayName: 'OAB', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'CAPESAUDE', name: 'CAPESAUDE', displayName: 'CapeSaúde', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'CASEMBRAPA', name: 'CASEMBRAPA', displayName: 'Casembrapa', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'CULTURAL', name: 'CULTURAL', displayName: 'Cultural', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'EVIDA', name: 'EVIDA', displayName: 'Evida', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'FOGAS', name: 'FOGAS', displayName: 'Fogas', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'FUSEX', name: 'FUSEX', displayName: 'Fusex', discount: false, discountPercentage: 0, isParticular: false },
            { code: 'PLAN_ASSITE', name: 'PLAN-ASSITE', displayName: 'Plan-Assite', discount: false, discountPercentage: 0, isParticular: false },
            // Convênios com desconto
            { code: 'ADEPOL', name: 'ADEPOL', displayName: 'Adepol', discount: true, discountPercentage: 20, isParticular: false },
            { code: 'BEM_CARE', name: 'BEM CARE', displayName: 'Bem Care', discount: true, discountPercentage: 20, isParticular: false },
            { code: 'BEMOL', name: 'BEMOL', displayName: 'Bemol', discount: true, discountPercentage: 20, isParticular: false },
            { code: 'CLUBSAUDE', name: 'CLUBSAÚDE', displayName: 'ClubSaúde', discount: true, discountPercentage: 20, isParticular: false },
            { code: 'PRO_SAUDE', name: 'PRO-SAUDE', displayName: 'Pro-Saúde', discount: true, discountPercentage: 20, isParticular: false },
            { code: 'VITA', name: 'VITA', displayName: 'Vita', discount: true, discountPercentage: 20, isParticular: false },
            // Particular
            { code: 'PARTICULAR', name: 'PARTICULAR', displayName: 'Particular', discount: false, discountPercentage: 0, isParticular: true }
        ]

        for (const ins of insurances) {
            const created = await prisma.insuranceCompany.upsert({
                where: { code: ins.code },
                update: {},
                create: {
                    code: ins.code,
                    name: ins.name,
                    displayName: ins.displayName,
                    discount: ins.discount,
                    discountPercentage: ins.discountPercentage,
                    isParticular: ins.isParticular,
                    isActive: true
                }
            })
            console.log(`✅ Convênio criado: ${created.displayName}`)
        }
        console.log('')

        // 4. CRIAR TABELA DE PREÇOS VIEIRALVES (PARTICULAR)
        console.log('💰 Criando tabela de preços Vieiralves (Particular)...')

        const vieiralvesPrices = [
            { procedureCode: 'FISIO_ORTOPEDICA', price: 90.00, hasPackage: true, packageInfo: 'Pacote 10 sessões: R$ 800,00' },
            { procedureCode: 'FISIO_NEUROLOGICA', price: 100.00, hasPackage: true, packageInfo: 'Pacote 10 sessões: R$ 900,00' },
            { procedureCode: 'FISIO_RESPIRATORIA', price: 100.00, hasPackage: true, packageInfo: 'Pacote 10 sessões: R$ 900,00' },
            { procedureCode: 'FISIO_PELVICA', price: 220.00, hasPackage: true, packageInfo: 'Pacote 10 sessões: R$ 2.000,00' },
            { procedureCode: 'ACUPUNTURA', price: 180.00, hasPackage: true, packageInfo: 'Pacote 10 sessões: R$ 1.600,00' },
            { procedureCode: 'RPG', price: 120.00, hasPackage: true, packageInfo: 'Pacote 10 sessões: R$ 1.000,00' },
            { procedureCode: 'PILATES', price: 70.00, hasPackage: false },
            { procedureCode: 'QUIROPRAXIA', price: 120.00, hasPackage: false },
            { procedureCode: 'CONSULTA_ORTOPEDISTA', price: 400.00, hasPackage: false },
            { procedureCode: 'AVALIACAO_FISIO_PELVICA', price: 250.00, hasPackage: false },
            { procedureCode: 'AVALIACAO_ACUPUNTURA', price: 200.00, hasPackage: false }
        ]

        for (const price of vieiralvesPrices) {
            await prisma.clinicInsuranceProcedure.upsert({
                where: {
                    clinicId_insuranceCode_procedureCode: {
                        clinicId: vieiralves.id,
                        insuranceCode: 'PARTICULAR',
                        procedureCode: price.procedureCode
                    }
                },
                update: {},
                create: {
                    clinicId: vieiralves.id,
                    insuranceCode: 'PARTICULAR',
                    procedureCode: price.procedureCode,
                    price: price.price,
                    hasPackage: price.hasPackage,
                    packageInfo: price.packageInfo,
                    isActive: true
                }
            })
        }
        console.log(`✅ ${vieiralvesPrices.length} preços criados para Vieiralves (Particular)\n`)

        // 5. CRIAR TABELA DE PREÇOS SÃO JOSÉ (PARTICULAR)
        console.log('💰 Criando tabela de preços São José (Particular)...')

        const saoJosePrices = [
            { procedureCode: 'FISIO_ORTOPEDICA', price: 45.00, hasPackage: true, packageInfo: 'Pacote 10 sessões: R$ 200,00' },
            { procedureCode: 'FISIO_NEUROLOGICA', price: 60.00, hasPackage: true, packageInfo: 'Pacote 10 sessões: R$ 500,00' },
            { procedureCode: 'FISIO_RESPIRATORIA', price: 60.00, hasPackage: true, packageInfo: 'Pacote 10 sessões: R$ 500,00' },
            { procedureCode: 'FISIO_POS_OPERATORIA', price: 60.00, hasPackage: true, packageInfo: 'Pacote 10 sessões: R$ 500,00' },
            { procedureCode: 'ACUPUNTURA', price: 60.00, hasPackage: true, packageInfo: 'Pacote 10 sessões: R$ 400,00' },
            { procedureCode: 'RPG', price: 50.00, hasPackage: true, packageInfo: 'Pacote 10 sessões: R$ 350,00' },
            { procedureCode: 'CONSULTA_ORTOPEDISTA', price: 200.00, hasPackage: false },
            { procedureCode: 'CONSULTA_CLINICO_GERAL', price: 200.00, hasPackage: false }
        ]

        for (const price of saoJosePrices) {
            await prisma.clinicInsuranceProcedure.upsert({
                where: {
                    clinicId_insuranceCode_procedureCode: {
                        clinicId: saoJose.id,
                        insuranceCode: 'PARTICULAR',
                        procedureCode: price.procedureCode
                    }
                },
                update: {},
                create: {
                    clinicId: saoJose.id,
                    insuranceCode: 'PARTICULAR',
                    procedureCode: price.procedureCode,
                    price: price.price,
                    hasPackage: price.hasPackage,
                    packageInfo: price.packageInfo,
                    isActive: true
                }
            })
        }
        console.log(`✅ ${saoJosePrices.length} preços criados para São José (Particular)\n`)

        console.log('✅ Migração concluída com sucesso!')
        console.log('\n📊 Resumo:')
        console.log(`   • 2 clínicas criadas`)
        console.log(`   • ${procedures.length} procedimentos criados`)
        console.log(`   • ${insurances.length} convênios criados`)
        console.log(`   • ${vieiralvesPrices.length + saoJosePrices.length} preços configurados`)

    } catch (error) {
        console.error('❌ Erro na migração:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Executar migração
migrateClinicData()
    .then(() => {
        console.log('\n🎉 Migração finalizada!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Erro fatal:', error)
        process.exit(1)
    })
