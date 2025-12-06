import prisma from '../api/prisma/client.js'

/**
 * Script COMPLETO para popular TODOS os convênios e procedimentos
 * Baseado no infor_clinic.txt completo
 */

async function populateAllInsuranceCoverage() {
    console.log('🚀 Populando TODOS os convênios e procedimentos...\n')

    try {
        const vieiralves = await prisma.clinic.findUnique({ where: { code: 'VIEIRALVES' } })
        const saoJose = await prisma.clinic.findUnique({ where: { code: 'SAO_JOSE' } })

        if (!vieiralves || !saoJose) {
            throw new Error('Clínicas não encontradas!')
        }

        // Mapeamento COMPLETO de convênios e procedimentos
        const insuranceCoverage = [
            {
                insurance: 'BRADESCO',
                procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'INFILTRACAO', 'RPG']
            },
            {
                insurance: 'SULAMERICA',
                procedures: ['ACUPUNTURA', 'ESTIMULACAO_ELETRICA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA']
            },
            {
                insurance: 'MEDISERVICE',
                procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'INFILTRACAO', 'RPG']
            },
            {
                insurance: 'SAUDE_CAIXA',
                procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'TERAPIA_ONDAS_CHOQUE']
            },
            {
                insurance: 'PETROBRAS',
                procedures: ['FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'RPG']
            },
            {
                insurance: 'GEAP',
                procedures: ['CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA']
            },
            {
                insurance: 'PRO_SOCIAL',
                procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'FISIO_RESPIRATORIA', 'INFILTRACAO', 'RPG']
            },
            {
                insurance: 'POSTAL_SAUDE',
                procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'RPG']
            },
            {
                insurance: 'CONAB',
                procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'ESTIMULACAO_ELETRICA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'FISIO_RESPIRATORIA', 'INFILTRACAO', 'RPG']
            },
            {
                insurance: 'AFFEAM',
                procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'FISIO_RESPIRATORIA']
            },
            {
                insurance: 'AMBEP',
                procedures: ['ACUPUNTURA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'FISIO_RESPIRATORIA', 'RPG']
            },
            {
                insurance: 'GAMA',
                procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_RESPIRATORIA']
            },
            {
                insurance: 'LIFE',
                procedures: ['ACUPUNTURA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'FISIO_RESPIRATORIA', 'RPG']
            },
            {
                insurance: 'NOTREDAME',
                procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'RPG']
            },
            {
                insurance: 'OAB',
                procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'RPG']
            },
            {
                insurance: 'CAPESAUDE',
                procedures: ['ACUPUNTURA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'RPG']
            },
            {
                insurance: 'CASEMBRAPA',
                procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA']
            },
            {
                insurance: 'CULTURAL',
                procedures: ['ACUPUNTURA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_RESPIRATORIA']
            },
            {
                insurance: 'EVIDA',
                procedures: ['ACUPUNTURA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'RPG']
            },
            {
                insurance: 'FOGAS',
                procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA']
            },
            {
                insurance: 'FUSEX',
                procedures: ['ACUPUNTURA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'RPG']
            },
            {
                insurance: 'PLAN_ASSITE',
                procedures: ['ACUPUNTURA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_RESPIRATORIA']
            }
        ]

        let totalCreated = 0
        let totalUpdated = 0

        for (const coverage of insuranceCoverage) {
            console.log(`📋 Processando ${coverage.insurance}...`)

            for (const procCode of coverage.procedures) {
                // Criar/atualizar para VIEIRALVES
                const vieiralvesResult = await prisma.clinicInsuranceProcedure.upsert({
                    where: {
                        clinicId_insuranceCode_procedureCode: {
                            clinicId: vieiralves.id,
                            insuranceCode: coverage.insurance,
                            procedureCode: procCode
                        }
                    },
                    update: {
                        isActive: true
                    },
                    create: {
                        clinicId: vieiralves.id,
                        insuranceCode: coverage.insurance,
                        procedureCode: procCode,
                        price: 0, // Convênio cobre
                        hasPackage: false,
                        isActive: true
                    }
                })

                // Verificar se São José tem este procedimento
                const saoJoseHasProcedure = await prisma.clinicProcedure.findFirst({
                    where: {
                        clinicId: saoJose.id,
                        procedureCode: procCode
                    }
                })

                if (saoJoseHasProcedure) {
                    await prisma.clinicInsuranceProcedure.upsert({
                        where: {
                            clinicId_insuranceCode_procedureCode: {
                                clinicId: saoJose.id,
                                insuranceCode: coverage.insurance,
                                procedureCode: procCode
                            }
                        },
                        update: {
                            isActive: true
                        },
                        create: {
                            clinicId: saoJose.id,
                            insuranceCode: coverage.insurance,
                            procedureCode: procCode,
                            price: 0, // Convênio cobre
                            hasPackage: false,
                            isActive: true
                        }
                    })
                }

                totalCreated++
            }

            console.log(`✅ ${coverage.procedures.length} procedimentos configurados`)
        }

        console.log(`\n✅ Total de ${totalCreated} vínculos criados/atualizados!`)
        console.log('\n📊 Resumo:')
        console.log(`   • ${insuranceCoverage.length} convênios configurados`)
        console.log(`   • Todos os procedimentos cobertos pelos convênios`)
        console.log(`   • Preço = 0 (convênio cobre)`)

    } catch (error) {
        console.error('❌ Erro:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Executar
populateAllInsuranceCoverage()
    .then(() => {
        console.log('\n🎉 Script finalizado!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Erro fatal:', error)
        process.exit(1)
    })
