import prisma from '../api/prisma/client.js'

/**
 * Script para popular relações entre clínicas, procedimentos e convênios
 * 
 * Cria:
 * - ClinicProcedure (quais procedimentos cada clínica oferece)
 * - ClinicInsurance (quais convênios cada clínica aceita)
 */

async function populateRelations() {
    console.log('🚀 Populando relações entre clínicas, procedimentos e convênios...\n')

    try {
        // Buscar clínicas
        const vieiralves = await prisma.clinic.findUnique({ where: { code: 'VIEIRALVES' } })
        const saoJose = await prisma.clinic.findUnique({ where: { code: 'SAO_JOSE' } })

        if (!vieiralves || !saoJose) {
            throw new Error('Clínicas não encontradas! Execute primeiro o script de migração.')
        }

        // 1. POPULAR CLINIC_PROCEDURE (quais procedimentos cada clínica oferece)
        console.log('📋 Criando relações Clínica-Procedimento...')

        // Procedimentos VIEIRALVES
        const vieiralvesProcedures = [
            'FISIO_ORTOPEDICA',
            'FISIO_NEUROLOGICA',
            'FISIO_RESPIRATORIA',
            'FISIO_PELVICA',
            'ACUPUNTURA',
            'RPG',
            'PILATES',
            'QUIROPRAXIA',
            'CONSULTA_ORTOPEDISTA',
            'AVALIACAO_FISIO_PELVICA',
            'AVALIACAO_ACUPUNTURA'
        ]

        for (const procCode of vieiralvesProcedures) {
            await prisma.clinicProcedure.upsert({
                where: {
                    clinicId_procedureCode: {
                        clinicId: vieiralves.id,
                        procedureCode: procCode
                    }
                },
                update: {},
                create: {
                    clinicId: vieiralves.id,
                    procedureCode: procCode,
                    isActive: true
                }
            })
        }
        console.log(`✅ ${vieiralvesProcedures.length} procedimentos vinculados a Vieiralves`)

        // Procedimentos SÃO JOSÉ
        const saoJoseProcedures = [
            'FISIO_ORTOPEDICA',
            'FISIO_NEUROLOGICA',
            'FISIO_RESPIRATORIA',
            'FISIO_POS_OPERATORIA',
            'ACUPUNTURA',
            'RPG',
            'CONSULTA_ORTOPEDISTA',
            'CONSULTA_CLINICO_GERAL'
        ]

        for (const procCode of saoJoseProcedures) {
            await prisma.clinicProcedure.upsert({
                where: {
                    clinicId_procedureCode: {
                        clinicId: saoJose.id,
                        procedureCode: procCode
                    }
                },
                update: {},
                create: {
                    clinicId: saoJose.id,
                    procedureCode: procCode,
                    isActive: true
                }
            })
        }
        console.log(`✅ ${saoJoseProcedures.length} procedimentos vinculados a São José\n`)

        // 2. POPULAR CLINIC_INSURANCE (quais convênios cada clínica aceita)
        console.log('🏥 Criando relações Clínica-Convênio...')

        // Todos os convênios para ambas as clínicas
        const allInsurances = await prisma.insuranceCompany.findMany({
            select: { code: true }
        })

        // Vincular todos os convênios a VIEIRALVES
        for (const ins of allInsurances) {
            await prisma.clinicInsurance.upsert({
                where: {
                    clinicId_insuranceCode: {
                        clinicId: vieiralves.id,
                        insuranceCode: ins.code
                    }
                },
                update: {},
                create: {
                    clinicId: vieiralves.id,
                    insuranceCode: ins.code,
                    isActive: true
                }
            })
        }
        console.log(`✅ ${allInsurances.length} convênios vinculados a Vieiralves`)

        // Vincular todos os convênios a SÃO JOSÉ
        for (const ins of allInsurances) {
            await prisma.clinicInsurance.upsert({
                where: {
                    clinicId_insuranceCode: {
                        clinicId: saoJose.id,
                        insuranceCode: ins.code
                    }
                },
                update: {},
                create: {
                    clinicId: saoJose.id,
                    insuranceCode: ins.code,
                    isActive: true
                }
            })
        }
        console.log(`✅ ${allInsurances.length} convênios vinculados a São José\n`)

        console.log('✅ Relações populadas com sucesso!')
        console.log('\n📊 Resumo:')
        console.log(`   • Vieiralves: ${vieiralvesProcedures.length} procedimentos`)
        console.log(`   • São José: ${saoJoseProcedures.length} procedimentos`)
        console.log(`   • Ambas clínicas: ${allInsurances.length} convênios`)

    } catch (error) {
        console.error('❌ Erro ao popular relações:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Executar
populateRelations()
    .then(() => {
        console.log('\n🎉 Script finalizado!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Erro fatal:', error)
        process.exit(1)
    })
