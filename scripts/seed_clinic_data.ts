import prisma from '../api/prisma/client.js'

/**
 * Script COMPLETO para seed de dados de clínica
 * Executa na ordem correta:
 * 1. Clínicas, Procedimentos, Convênios (migrate_clinic_data_to_db.ts)
 * 2. Relações Clínica-Procedimento e Clínica-Convênio (populate_clinic_relations.ts)
 * 3. Preços de Convênios (populate_insurance_prices.ts)
 * 
 * USO NO RAILWAY SHELL:
 * npx tsx scripts/seed_clinic_data.ts
 */

async function seedClinicData() {
    console.log('🌱 Iniciando seed completo de dados de clínica...\n')

    try {
        // ============================================
        // ETAPA 1: CRIAR CLÍNICAS, PROCEDIMENTOS E CONVÊNIOS
        // ============================================
        console.log('📍 ETAPA 1: Criando clínicas, procedimentos e convênios...\n')

        // 1.1. CRIAR CLÍNICAS
        console.log('📍 Criando clínicas...')

        const vieiralves = await prisma.clinic.upsert({
            where: { code: 'VIEIRALVES' },
            update: {},
            create: {
                code: 'VIEIRALVES',
                name: 'Unidade Vieiralves',
                displayName: 'Vieiralves',
                address: 'Rua Rio Içá, 850',
                neighborhood: 'Nossa Senhora das Graças',
                city: 'Manaus',
                state: 'AM',
                zipCode: '69053-000',
                phone: '(92) 3584-2864',
                email: 'vieiralves@iaam.com.br',
                openingHours: {
                    'Segunda-Sexta': '07:30-19:30',
                    'Sábado': '08:00-12:00',
                    'Domingo': 'Fechado'
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
        console.log(`✅ Clínica Vieiralves: ${vieiralves.id}`)

        const saoJose = await prisma.clinic.upsert({
            where: { code: 'SAO_JOSE' },
            update: {},
            create: {
                code: 'SAO_JOSE',
                name: 'Unidade São José',
                displayName: 'São José',
                address: 'Av. Autaz Mirim, 5773',
                neighborhood: 'São José Operário',
                city: 'Manaus',
                state: 'AM',
                zipCode: '69085-000',
                phone: '(92) 3584-2864',
                email: 'saojose@iaam.com.br',
                openingHours: {
                    'Segunda-Sexta': '07:30-18:00',
                    'Sábado': '08:00-12:00',
                    'Domingo': 'Fechado'
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
        console.log(`✅ Clínica São José: ${saoJose.id}\n`)

        // 1.2. CRIAR PROCEDIMENTOS
        console.log('💉 Criando procedimentos...')

        const procedures = [
            { code: 'FISIO_ORTOPEDICA', name: 'Fisioterapia Ortopédica', description: 'Tratamento de lesões musculoesqueléticas, pós-operatório e reabilitação ortopédica', basePrice: 90.00, duration: 50, requiresEvaluation: false },
            { code: 'FISIO_NEUROLOGICA', name: 'Fisioterapia Neurológica', description: 'Reabilitação de pacientes com doenças neurológicas (AVC, Parkinson, etc)', basePrice: 100.00, duration: 50, requiresEvaluation: false },
            { code: 'FISIO_RESPIRATORIA', name: 'Fisioterapia Respiratória', description: 'Tratamento de doenças respiratórias e reabilitação pulmonar', basePrice: 100.00, duration: 50, requiresEvaluation: false },
            { code: 'FISIO_PELVICA', name: 'Fisioterapia Pélvica', description: 'Tratamento de disfunções do assoalho pélvico', basePrice: 220.00, duration: 50, requiresEvaluation: true },
            { code: 'ACUPUNTURA', name: 'Acupuntura', description: 'Tratamento através de técnicas de medicina chinesa', basePrice: 180.00, duration: 50, requiresEvaluation: true },
            { code: 'RPG', name: 'RPG', description: 'Reeducação Postural Global', basePrice: 120.00, duration: 50, requiresEvaluation: false },
            { code: 'PILATES', name: 'Pilates', description: 'Exercícios de fortalecimento e alongamento', basePrice: 70.00, duration: 50, requiresEvaluation: false },
            { code: 'QUIROPRAXIA', name: 'Quiropraxia', description: 'Ajustes quiropráticos para alívio de dores', basePrice: 120.00, duration: 40, requiresEvaluation: false },
            { code: 'CONSULTA_ORTOPEDISTA', name: 'Consulta com Ortopedista', description: 'Consulta médica ortopédica', basePrice: 400.00, duration: 30, requiresEvaluation: false },
            { code: 'AVALIACAO_FISIO_PELVICA', name: 'Avaliação Fisioterapia Pélvica', description: 'Avaliação inicial para fisioterapia pélvica', basePrice: 250.00, duration: 60, requiresEvaluation: false },
            { code: 'AVALIACAO_ACUPUNTURA', name: 'Avaliação Acupuntura', description: 'Avaliação inicial para acupuntura', basePrice: 200.00, duration: 60, requiresEvaluation: false },
            { code: 'INFILTRACAO', name: 'Infiltração de ponto gatilho e Agulhamento a seco', description: 'Técnica para alívio de dores musculares', basePrice: 150.00, duration: 40, requiresEvaluation: false },
            { code: 'ESTIMULACAO_ELETRICA', name: 'Estimulação Elétrica Transcutânea', description: 'TENS para alívio de dores', basePrice: 80.00, duration: 30, requiresEvaluation: false },
            { code: 'TERAPIA_ONDAS_CHOQUE', name: 'Terapias por Ondas de Choque', description: 'Tratamento com ondas de choque para lesões', basePrice: 200.00, duration: 30, requiresEvaluation: false },
            { code: 'FISIO_POS_OPERATORIA', name: 'Fisioterapia Pós-operatória', description: 'Reabilitação após cirurgias', basePrice: 60.00, duration: 50, requiresEvaluation: false },
            { code: 'CONSULTA_CLINICO_GERAL', name: 'Consulta Clínico Geral', description: 'Consulta médica clínica geral', basePrice: 200.00, duration: 30, requiresEvaluation: false }
        ]

        for (const proc of procedures) {
            await prisma.procedure.upsert({
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
        }
        console.log(`✅ ${procedures.length} procedimentos criados\n`)

        // 1.3. CRIAR CONVÊNIOS
        console.log('🏥 Criando convênios...')

        const insurances = [
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
            await prisma.insuranceCompany.upsert({
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
        }
        console.log(`✅ ${insurances.length} convênios criados\n`)

        // ============================================
        // ETAPA 2: CRIAR RELAÇÕES CLÍNICA-PROCEDIMENTO E CLÍNICA-CONVÊNIO
        // ============================================
        console.log('🔗 ETAPA 2: Criando relações...\n')

        // 2.1. VINCULAR PROCEDIMENTOS ÀS CLÍNICAS
        console.log('📋 Vinculando procedimentos às clínicas...')

        const vieiralvesProcedures = [
            'FISIO_ORTOPEDICA', 'FISIO_NEUROLOGICA', 'FISIO_RESPIRATORIA', 'FISIO_PELVICA',
            'ACUPUNTURA', 'RPG', 'PILATES', 'QUIROPRAXIA', 'CONSULTA_ORTOPEDISTA',
            'AVALIACAO_FISIO_PELVICA', 'AVALIACAO_ACUPUNTURA', 'INFILTRACAO'
        ]

        for (const procCode of vieiralvesProcedures) {
            await prisma.clinicProcedure.upsert({
                where: {
                    clinicId_procedureCode: {
                        clinicId: vieiralves.id,
                        procedureCode: procCode
                    }
                },
                update: { isActive: true },
                create: {
                    clinicId: vieiralves.id,
                    procedureCode: procCode,
                    isActive: true
                }
            })
        }
        console.log(`✅ ${vieiralvesProcedures.length} procedimentos vinculados a Vieiralves`)

        const saoJoseProcedures = [
            'FISIO_ORTOPEDICA', 'FISIO_NEUROLOGICA', 'FISIO_RESPIRATORIA', 'FISIO_POS_OPERATORIA',
            'ACUPUNTURA', 'RPG', 'CONSULTA_ORTOPEDISTA', 'CONSULTA_CLINICO_GERAL'
        ]

        for (const procCode of saoJoseProcedures) {
            await prisma.clinicProcedure.upsert({
                where: {
                    clinicId_procedureCode: {
                        clinicId: saoJose.id,
                        procedureCode: procCode
                    }
                },
                update: { isActive: true },
                create: {
                    clinicId: saoJose.id,
                    procedureCode: procCode,
                    isActive: true
                }
            })
        }
        console.log(`✅ ${saoJoseProcedures.length} procedimentos vinculados a São José\n`)

        // 2.2. VINCULAR CONVÊNIOS ÀS CLÍNICAS
        console.log('🏥 Vinculando convênios às clínicas...')

        for (const ins of insurances) {
            // Vieiralves
            await prisma.clinicInsurance.upsert({
                where: {
                    clinicId_insuranceCode: {
                        clinicId: vieiralves.id,
                        insuranceCode: ins.code
                    }
                },
                update: { isActive: true },
                create: {
                    clinicId: vieiralves.id,
                    insuranceCode: ins.code,
                    isActive: true
                }
            })

            // São José
            await prisma.clinicInsurance.upsert({
                where: {
                    clinicId_insuranceCode: {
                        clinicId: saoJose.id,
                        insuranceCode: ins.code
                    }
                },
                update: { isActive: true },
                create: {
                    clinicId: saoJose.id,
                    insuranceCode: ins.code,
                    isActive: true
                }
            })
        }
        console.log(`✅ ${insurances.length} convênios vinculados a cada clínica\n`)

        // ============================================
        // ETAPA 3: CRIAR PREÇOS PARTICULAR
        // ============================================
        console.log('💰 ETAPA 3: Criando preços particular...\n')

        // 3.1. PREÇOS VIEIRALVES (PARTICULAR)
        console.log('💰 Preços Vieiralves (Particular)...')

        const vieiralvesPrices = [
            { procedureCode: 'FISIO_ORTOPEDICA', price: 90.00, hasPackage: true, packageInfo: JSON.stringify([{ name: 'Pacote 10 sessões', sessions: 10, price: 800.00, description: 'Avaliação GRÁTIS' }]) },
            { procedureCode: 'FISIO_NEUROLOGICA', price: 100.00, hasPackage: true, packageInfo: JSON.stringify([{ name: 'Pacote 10 sessões', sessions: 10, price: 900.00, description: 'Avaliação GRÁTIS' }]) },
            { procedureCode: 'FISIO_RESPIRATORIA', price: 100.00, hasPackage: true, packageInfo: JSON.stringify([{ name: 'Pacote 10 sessões', sessions: 10, price: 900.00, description: 'Avaliação GRÁTIS' }]) },
            { procedureCode: 'FISIO_PELVICA', price: 220.00, hasPackage: true, packageInfo: JSON.stringify([{ name: 'Pacote 10 sessões', sessions: 10, price: 2000.00, description: 'Avaliação GRÁTIS' }]) },
            { procedureCode: 'ACUPUNTURA', price: 180.00, hasPackage: true, packageInfo: JSON.stringify([{ name: 'Pacote 10 sessões', sessions: 10, price: 1600.00, description: 'Avaliação GRÁTIS' }]) },
            { procedureCode: 'RPG', price: 120.00, hasPackage: true, packageInfo: JSON.stringify([{ name: 'Pacote 10 sessões', sessions: 10, price: 1000.00, description: 'Avaliação GRÁTIS' }]) },
            { procedureCode: 'PILATES', price: 70.00, hasPackage: false },
            { procedureCode: 'QUIROPRAXIA', price: 120.00, hasPackage: false },
            { procedureCode: 'CONSULTA_ORTOPEDISTA', price: 400.00, hasPackage: false },
            { procedureCode: 'AVALIACAO_FISIO_PELVICA', price: 250.00, hasPackage: false },
            { procedureCode: 'AVALIACAO_ACUPUNTURA', price: 200.00, hasPackage: false },
            { procedureCode: 'INFILTRACAO', price: 150.00, hasPackage: false }
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
                update: {
                    price: price.price,
                    hasPackage: price.hasPackage,
                    packageInfo: price.packageInfo || null,
                    isActive: true
                },
                create: {
                    clinicId: vieiralves.id,
                    insuranceCode: 'PARTICULAR',
                    procedureCode: price.procedureCode,
                    price: price.price,
                    hasPackage: price.hasPackage,
                    packageInfo: price.packageInfo || null,
                    isActive: true
                }
            })
        }
        console.log(`✅ ${vieiralvesPrices.length} preços criados para Vieiralves (Particular)`)

        // 3.2. PREÇOS SÃO JOSÉ (PARTICULAR)
        console.log('💰 Preços São José (Particular)...')

        const saoJosePrices = [
            { procedureCode: 'FISIO_ORTOPEDICA', price: 45.00, hasPackage: true, packageInfo: JSON.stringify([{ name: 'Pacote 10 sessões', sessions: 10, price: 200.00, description: 'Avaliação GRÁTIS' }]) },
            { procedureCode: 'FISIO_NEUROLOGICA', price: 60.00, hasPackage: true, packageInfo: JSON.stringify([{ name: 'Pacote 10 sessões', sessions: 10, price: 500.00, description: 'Avaliação GRÁTIS' }]) },
            { procedureCode: 'FISIO_RESPIRATORIA', price: 60.00, hasPackage: true, packageInfo: JSON.stringify([{ name: 'Pacote 10 sessões', sessions: 10, price: 500.00, description: 'Avaliação GRÁTIS' }]) },
            { procedureCode: 'FISIO_POS_OPERATORIA', price: 60.00, hasPackage: true, packageInfo: JSON.stringify([{ name: 'Pacote 10 sessões', sessions: 10, price: 500.00, description: 'Avaliação GRÁTIS' }]) },
            { procedureCode: 'ACUPUNTURA', price: 60.00, hasPackage: true, packageInfo: JSON.stringify([{ name: 'Pacote 10 sessões', sessions: 10, price: 400.00, description: 'Avaliação GRÁTIS' }]) },
            { procedureCode: 'RPG', price: 50.00, hasPackage: true, packageInfo: JSON.stringify([{ name: 'Pacote 10 sessões', sessions: 10, price: 350.00, description: 'Avaliação GRÁTIS' }]) },
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
                update: {
                    price: price.price,
                    hasPackage: price.hasPackage,
                    packageInfo: price.packageInfo || null,
                    isActive: true
                },
                create: {
                    clinicId: saoJose.id,
                    insuranceCode: 'PARTICULAR',
                    procedureCode: price.procedureCode,
                    price: price.price,
                    hasPackage: price.hasPackage,
                    packageInfo: price.packageInfo || null,
                    isActive: true
                }
            })
        }
        console.log(`✅ ${saoJosePrices.length} preços criados para São José (Particular)\n`)

        // ============================================
        // ETAPA 4: CRIAR PREÇOS DE CONVÊNIOS
        // ============================================
        console.log('🏥 ETAPA 4: Criando cobertura de convênios...\n')

        const insuranceCoverage = [
            { insurance: 'BRADESCO', procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'INFILTRACAO', 'RPG'] },
            { insurance: 'SULAMERICA', procedures: ['ACUPUNTURA', 'ESTIMULACAO_ELETRICA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA'] },
            { insurance: 'MEDISERVICE', procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'INFILTRACAO', 'RPG'] },
            { insurance: 'SAUDE_CAIXA', procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'TERAPIA_ONDAS_CHOQUE'] },
            { insurance: 'PETROBRAS', procedures: ['FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'RPG'] },
            { insurance: 'GEAP', procedures: ['CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA'] },
            { insurance: 'PRO_SOCIAL', procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'FISIO_RESPIRATORIA', 'INFILTRACAO', 'RPG'] },
            { insurance: 'POSTAL_SAUDE', procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'RPG'] },
            { insurance: 'CONAB', procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'ESTIMULACAO_ELETRICA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'FISIO_RESPIRATORIA', 'INFILTRACAO', 'RPG'] },
            { insurance: 'AFFEAM', procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'FISIO_RESPIRATORIA'] },
            { insurance: 'AMBEP', procedures: ['ACUPUNTURA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'FISIO_RESPIRATORIA', 'RPG'] },
            { insurance: 'GAMA', procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_RESPIRATORIA'] },
            { insurance: 'LIFE', procedures: ['ACUPUNTURA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'FISIO_RESPIRATORIA', 'RPG'] },
            { insurance: 'NOTREDAME', procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'RPG'] },
            { insurance: 'OAB', procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'RPG'] },
            { insurance: 'CAPESAUDE', procedures: ['ACUPUNTURA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'RPG'] },
            { insurance: 'CASEMBRAPA', procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA'] },
            { insurance: 'CULTURAL', procedures: ['ACUPUNTURA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_RESPIRATORIA'] },
            { insurance: 'EVIDA', procedures: ['ACUPUNTURA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'RPG'] },
            { insurance: 'FOGAS', procedures: ['ACUPUNTURA', 'CONSULTA_ORTOPEDISTA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA'] },
            { insurance: 'FUSEX', procedures: ['ACUPUNTURA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_PELVICA', 'RPG'] },
            { insurance: 'PLAN_ASSITE', procedures: ['ACUPUNTURA', 'FISIO_NEUROLOGICA', 'FISIO_ORTOPEDICA', 'FISIO_RESPIRATORIA'] }
        ]

        let totalCoverage = 0

        for (const coverage of insuranceCoverage) {
            for (const procCode of coverage.procedures) {
                // Verificar se procedimento existe
                const procedure = await prisma.procedure.findUnique({ where: { code: procCode } })
                if (!procedure) {
                    console.warn(`⚠️  Procedimento não encontrado: ${procCode}`)
                    continue
                }

                // Criar para Vieiralves (se a clínica oferece o procedimento)
                const vieiralvesHasProc = await prisma.clinicProcedure.findFirst({
                    where: {
                        clinicId: vieiralves.id,
                        procedureCode: procCode
                    }
                })

                if (vieiralvesHasProc) {
                    await prisma.clinicInsuranceProcedure.upsert({
                        where: {
                            clinicId_insuranceCode_procedureCode: {
                                clinicId: vieiralves.id,
                                insuranceCode: coverage.insurance,
                                procedureCode: procCode
                            }
                        },
                        update: { isActive: true },
                        create: {
                            clinicId: vieiralves.id,
                            insuranceCode: coverage.insurance,
                            procedureCode: procCode,
                            price: 0, // Convênio cobre
                            hasPackage: false,
                            isActive: true
                        }
                    })
                    totalCoverage++
                }

                // Criar para São José (se a clínica oferece o procedimento)
                const saoJoseHasProc = await prisma.clinicProcedure.findFirst({
                    where: {
                        clinicId: saoJose.id,
                        procedureCode: procCode
                    }
                })

                if (saoJoseHasProc) {
                    await prisma.clinicInsuranceProcedure.upsert({
                        where: {
                            clinicId_insuranceCode_procedureCode: {
                                clinicId: saoJose.id,
                                insuranceCode: coverage.insurance,
                                procedureCode: procCode
                            }
                        },
                        update: { isActive: true },
                        create: {
                            clinicId: saoJose.id,
                            insuranceCode: coverage.insurance,
                            procedureCode: procCode,
                            price: 0, // Convênio cobre
                            hasPackage: false,
                            isActive: true
                        }
                    })
                    totalCoverage++
                }
            }
        }

        console.log(`✅ ${totalCoverage} vínculos de cobertura criados\n`)

        // ============================================
        // RESUMO FINAL
        // ============================================
        console.log('📊 RESUMO DO SEED:')
        console.log(`   ✅ 2 clínicas criadas`)
        console.log(`   ✅ ${procedures.length} procedimentos criados`)
        console.log(`   ✅ ${insurances.length} convênios criados`)
        console.log(`   ✅ ${vieiralvesProcedures.length} procedimentos vinculados a Vieiralves`)
        console.log(`   ✅ ${saoJoseProcedures.length} procedimentos vinculados a São José`)
        console.log(`   ✅ ${insurances.length} convênios vinculados a cada clínica`)
        console.log(`   ✅ ${vieiralvesPrices.length} preços particular para Vieiralves`)
        console.log(`   ✅ ${saoJosePrices.length} preços particular para São José`)
        console.log(`   ✅ ${totalCoverage} vínculos de cobertura de convênios`)
        console.log('\n🎉 Seed completo finalizado com sucesso!')

    } catch (error) {
        console.error('❌ Erro no seed:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Executar
seedClinicData()
    .then(() => {
        console.log('\n✅ Sistema pronto para uso!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Erro fatal:', error)
        process.exit(1)
    })
