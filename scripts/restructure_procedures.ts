import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Standardized procedures list
const PROCEDURES = [
    {
        code: 'consulta-ortopedica',
        name: 'Consulta Ortopédica',
        description: 'Avaliação médica ortopédica',
        importantInfo: 'Avaliação médica ortopédica para diagnóstico e tratamento de lesões músculo-esqueléticas',
        duration: 30,
        basePrice: 0,
        requiresEvaluation: false,
        categories: ['consulta']
    },
    {
        code: 'consulta-clinico-geral',
        name: 'Consulta Clínico Geral',
        description: 'Consulta com clínico geral',
        importantInfo: 'Consulta médica geral para avaliação de saúde e orientação',
        duration: 30,
        basePrice: 0,
        requiresEvaluation: false,
        categories: ['consulta']
    },
    {
        code: 'avaliacao-acupuntura',
        name: 'Avaliação de Acupuntura',
        description: 'Avaliação inicial para acupuntura',
        importantInfo: 'Avaliação inicial para acupuntura. Obrigatória antes da primeira sessão.',
        duration: 45,
        basePrice: 0,
        requiresEvaluation: false,
        categories: ['avaliacao']
    },
    {
        code: 'avaliacao-fisio-pelvica',
        name: 'Avaliação de Fisioterapia Pélvica',
        description: 'Avaliação inicial para fisioterapia pélvica',
        importantInfo: 'Avaliação inicial para fisioterapia pélvica. Obrigatória antes da primeira sessão.',
        duration: 60,
        basePrice: 0,
        requiresEvaluation: false,
        categories: ['avaliacao']
    },
    {
        code: 'acupuntura',
        name: 'Acupuntura',
        description: 'Tratamento com acupuntura para dor e equilíbrio energético',
        importantInfo: 'Tratamento com acupuntura para dor e equilíbrio energético. Requer avaliação prévia.',
        duration: 45,
        basePrice: 0,
        requiresEvaluation: true,
        categories: ['terapia']
    },
    {
        code: 'fisioterapia-ortopedica',
        name: 'Fisioterapia Ortopédica',
        description: 'Tratamento para lesões musculoesqueléticas',
        importantInfo: 'Tratamento para lesões musculoesqueléticas. Requer avaliação prévia.',
        duration: 45,
        basePrice: 0,
        requiresEvaluation: true,
        categories: ['fisioterapia']
    },
    {
        code: 'fisioterapia-neurologica',
        name: 'Fisioterapia Neurológica',
        description: 'Tratamento para condições neurológicas',
        importantInfo: 'Tratamento para condições neurológicas. Requer avaliação prévia.',
        duration: 45,
        basePrice: 0,
        requiresEvaluation: true,
        categories: ['fisioterapia']
    },
    {
        code: 'fisioterapia-pelvica',
        name: 'Fisioterapia Pélvica',
        description: 'Tratamento para disfunções do assoalho pélvico',
        importantInfo: 'Tratamento para disfunções do assoalho pélvico. Requer avaliação prévia.',
        duration: 45,
        basePrice: 0,
        requiresEvaluation: true,
        categories: ['fisioterapia']
    },
    {
        code: 'fisioterapia-respiratoria',
        name: 'Fisioterapia Respiratória',
        description: 'Tratamento para condições respiratórias',
        importantInfo: 'Tratamento para condições respiratórias. Requer avaliação prévia.',
        duration: 45,
        basePrice: 0,
        requiresEvaluation: true,
        categories: ['fisioterapia']
    },
    {
        code: 'fisioterapia-pos-operatoria',
        name: 'Fisioterapia Pós-operatória',
        description: 'Tratamento pós-cirúrgico',
        importantInfo: 'Tratamento pós-cirúrgico. Requer avaliação prévia.',
        duration: 45,
        basePrice: 0,
        requiresEvaluation: true,
        categories: ['fisioterapia']
    },
    {
        code: 'tens',
        name: 'Estimulação Elétrica (TENS)',
        description: 'Estimulação elétrica transcutânea',
        importantInfo: 'Estimulação elétrica transcutânea para controle de dor',
        duration: 30,
        basePrice: 0,
        requiresEvaluation: false,
        categories: ['terapia']
    },
    {
        code: 'infiltracao-ponto-gatilho',
        name: 'Infiltração de Ponto Gatilho',
        description: 'Infiltração para alívio de dor muscular',
        importantInfo: 'Infiltração direcionada para alívio de pontos de tensão muscular',
        duration: 30,
        basePrice: 0,
        requiresEvaluation: false,
        categories: ['procedimento']
    },
    {
        code: 'agulhamento-seco',
        name: 'Agulhamento a Seco',
        description: 'Técnica de agulhamento seco',
        importantInfo: 'Técnica de agulhamento seco para liberação de pontos gatilho',
        duration: 30,
        basePrice: 0,
        requiresEvaluation: false,
        categories: ['terapia']
    },
    {
        code: 'quiropraxia',
        name: 'Quiropraxia',
        description: 'Ajustes quiropráticos',
        importantInfo: 'Ajustes quiropráticos para alinhamento da coluna vertebral',
        duration: 30,
        basePrice: 0,
        requiresEvaluation: false,
        categories: ['terapia']
    },
    {
        code: 'ondas-de-choque',
        name: 'Terapias por Ondas de Choque',
        description: 'Tratamento com ondas de choque',
        importantInfo: 'Terapia por ondas de choque para tratamento de tendinites e calcificações',
        duration: 30,
        basePrice: 0,
        requiresEvaluation: false,
        categories: ['terapia']
    },
    {
        code: 'rpg',
        name: 'RPG',
        description: 'Reeducação Postural Global',
        importantInfo: 'Reeducação Postural Global. Requer avaliação prévia.',
        duration: 50,
        basePrice: 0,
        requiresEvaluation: true,
        categories: ['fisioterapia']
    },
    {
        code: 'pilates-2x',
        name: 'Pilates 2x semana',
        description: 'Pacote de Pilates 2x por semana',
        importantInfo: 'Pacote mensal de Pilates com 2 sessões semanais',
        duration: 50,
        basePrice: 0,
        requiresEvaluation: false,
        categories: ['pilates']
    },
    {
        code: 'pilates-3x',
        name: 'Pilates 3x semana',
        description: 'Pacote de Pilates 3x por semana',
        importantInfo: 'Pacote mensal de Pilates com 3 sessões semanais',
        duration: 50,
        basePrice: 0,
        requiresEvaluation: false,
        categories: ['pilates']
    },
    {
        code: 'pilates-avulsa',
        name: 'Pilates Avulso',
        description: 'Sessão avulsa de Pilates',
        importantInfo: 'Sessão avulsa de Pilates',
        duration: 50,
        basePrice: 0,
        requiresEvaluation: false,
        categories: ['pilates']
    }
];

// Insurance companies with discount info
const INSURANCES_WITH_DISCOUNT = [
    { code: 'adepol', name: 'ADEPOL', displayName: 'ADEPOL', discountPercentage: 20 },
    { code: 'bemcare', name: 'BEM CARE', displayName: 'BEM CARE', discountPercentage: 20 },
    { code: 'bemol', name: 'BEMOL', displayName: 'BEMOL', discountPercentage: 20 },
    { code: 'clubsaude', name: 'CLUBSAUDE', displayName: 'CLUBSAUDE', discountPercentage: 20 },
    { code: 'prosaude', name: 'PRO-SAUDE', displayName: 'PRO-SAUDE', discountPercentage: 20 },
    { code: 'vita', name: 'VITA', displayName: 'VITA', discountPercentage: 20 }
];

// Insurance-procedure mappings from infor_clinic.txt
const INSURANCE_PROCEDURE_MAPPINGS: Record<string, string[]> = {
    bradesco: ['acupuntura', 'consulta-ortopedica', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica', 'infiltracao-ponto-gatilho', 'agulhamento-seco', 'rpg'],
    sulamerica: ['acupuntura', 'tens', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica'],
    mediservice: ['acupuntura', 'consulta-ortopedica', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica', 'infiltracao-ponto-gatilho', 'agulhamento-seco', 'rpg'],
    saudecaixa: ['acupuntura', 'consulta-ortopedica', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica', 'ondas-de-choque'],
    petrobras: ['fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica', 'rpg'],
    geap: ['consulta-ortopedica', 'fisioterapia-neurologica', 'fisioterapia-ortopedica'],
    prosocial: ['acupuntura', 'consulta-ortopedica', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica', 'fisioterapia-respiratoria', 'infiltracao-ponto-gatilho', 'agulhamento-seco', 'rpg'],
    postalsaude: ['acupuntura', 'consulta-ortopedica', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica', 'rpg'],
    conab: ['acupuntura', 'consulta-ortopedica', 'tens', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica', 'fisioterapia-respiratoria', 'infiltracao-ponto-gatilho', 'rpg'],
    affeam: ['acupuntura', 'consulta-ortopedica', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica', 'fisioterapia-respiratoria'],
    ambep: ['acupuntura', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica', 'fisioterapia-respiratoria', 'rpg'],
    gama: ['acupuntura', 'consulta-ortopedica', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-respiratoria'],
    life: ['acupuntura', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica', 'fisioterapia-respiratoria', 'rpg'],
    notredame: ['acupuntura', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica', 'rpg'],
    oab: ['acupuntura', 'consulta-ortopedica', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-respiratoria', 'rpg'],
    capesaude: ['acupuntura'],
    casembrapa: ['fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica', 'rpg'],
    cultural: ['acupuntura', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica', 'fisioterapia-respiratoria', 'rpg'],
    evida: ['acupuntura', 'consulta-ortopedica', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-respiratoria', 'rpg'],
    fogas: ['acupuntura', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-respiratoria', 'rpg'],
    fusex: ['acupuntura', 'consulta-ortopedica', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'fisioterapia-pelvica', 'quiropraxia', 'rpg'],
    planassite: ['acupuntura', 'consulta-ortopedica', 'fisioterapia-pelvica', 'fisioterapia-neurologica', 'fisioterapia-ortopedica', 'rpg']
};

// Particular procedures for Vieiralves
const VIEIRALVES_PARTICULAR = [
    { procedureCode: 'fisioterapia-ortopedica', price: 90, isActive: true, hasPackage: false },
    { procedureCode: 'fisioterapia-neurologica', price: 100, isActive: true, hasPackage: false },
    { procedureCode: 'fisioterapia-respiratoria', price: 100, isActive: true, hasPackage: false },
    { procedureCode: 'fisioterapia-pelvica', price: 220, isActive: true, hasPackage: false },
    { procedureCode: 'consulta-ortopedica', price: 400, isActive: true, hasPackage: false },
    { procedureCode: 'avaliacao-acupuntura', price: 200, isActive: true, hasPackage: false },
    { procedureCode: 'acupuntura', price: 180, isActive: true, hasPackage: false },
    { procedureCode: 'avaliacao-fisio-pelvica', price: 250, isActive: true, hasPackage: false },
    { procedureCode: 'rpg', price: 120, isActive: true, hasPackage: false },
    { procedureCode: 'pilates-2x', price: 390, isActive: true, hasPackage: false },
    { procedureCode: 'pilates-3x', price: 560, isActive: true, hasPackage: false },
    { procedureCode: 'pilates-avulsa', price: 70, isActive: true, hasPackage: false },
    { procedureCode: 'quiropraxia', price: 120, isActive: true, hasPackage: false }
];

// Particular procedures for São José
const SAOJOSE_PARTICULAR = [
    { procedureCode: 'fisioterapia-ortopedica', price: 45, isActive: true, hasPackage: false },
    { procedureCode: 'fisioterapia-neurologica', price: 60, isActive: true, hasPackage: false },
    { procedureCode: 'fisioterapia-respiratoria', price: 60, isActive: true, hasPackage: false },
    { procedureCode: 'fisioterapia-pos-operatoria', price: 60, isActive: true, hasPackage: false },
    { procedureCode: 'acupuntura', price: 60, isActive: true, hasPackage: false },
    { procedureCode: 'rpg', price: 50, isActive: true, hasPackage: false },
    { procedureCode: 'consulta-ortopedica', price: 200, isActive: true, hasPackage: false },
    { procedureCode: 'consulta-clinico-geral', price: 200, isActive: true, hasPackage: false }
];

// Packages for São José
const SAOJOSE_PACKAGES = [
    { procedureCode: 'fisioterapia-ortopedica', price: 200, isActive: true, hasPackage: true },
    { procedureCode: 'fisioterapia-neurologica', price: 500, isActive: true, hasPackage: true },
    { procedureCode: 'fisioterapia-respiratoria', price: 500, isActive: true, hasPackage: true },
    { procedureCode: 'fisioterapia-pos-operatoria', price: 500, isActive: true, hasPackage: true },
    { procedureCode: 'acupuntura', price: 400, isActive: true, hasPackage: true },
    { procedureCode: 'rpg', price: 350, isActive: true, hasPackage: true }
];

async function main() {
    console.log('🚀 Starting database restructure...\n');

    try {
        // Step 1: Delete all existing data
        console.log('🗑️  Step 1: Deleting existing data...');
        await prisma.clinicInsuranceProcedure.deleteMany({});
        console.log('   ✅ Deleted all ClinicInsuranceProcedure records');

        await prisma.clinicProcedure.deleteMany({});
        console.log('   ✅ Deleted all ClinicProcedure records');

        await prisma.procedure.deleteMany({});
        console.log('   ✅ Deleted all Procedure records');

        console.log('\n📝 Step 2: Creating 19 standardized procedures...');
        for (const proc of PROCEDURES) {
            await prisma.procedure.create({ data: proc });
            console.log(`   ✅ Created: ${proc.name}`);
        }

        // Step 3: Update insurance companies with discount percentages
        console.log('\n💰 Step 3: Updating insurance companies with discounts...');
        for (const ins of INSURANCES_WITH_DISCOUNT) {
            const existing = await prisma.insuranceCompany.findUnique({ where: { code: ins.code } });
            if (existing) {
                await prisma.insuranceCompany.update({
                    where: { code: ins.code },
                    data: { discountPercentage: ins.discountPercentage, discount: true }
                });
                console.log(`   ✅ Updated ${ins.name} with ${ins.discountPercentage}% discount`);
            } else {
                await prisma.insuranceCompany.create({
                    data: {
                        code: ins.code,
                        name: ins.name,
                        displayName: ins.displayName,
                        discount: true,
                        discountPercentage: ins.discountPercentage,
                        isParticular: false,
                        isActive: true
                    }
                });
                console.log(`   ✅ Created ${ins.name} with ${ins.discountPercentage}% discount`);
            }
        }

        // Step 4: Seed insurance-procedure associations
        console.log('\n🔗 Step 4: Creating insurance-procedure associations...');

        // Get clinic IDs
        const vieiralves = await prisma.clinic.findFirst({ where: { code: 'vieiralves' } });
        const saojose = await prisma.clinic.findFirst({ where: { code: 'sao-jose' } });

        if (!vieiralves || !saojose) {
            throw new Error('Clinics not found! Please ensure vieiralves and saojose clinics exist.');
        }

        for (const [insuranceCode, procedureCodes] of Object.entries(INSURANCE_PROCEDURE_MAPPINGS)) {
            const insurance = await prisma.insuranceCompany.findUnique({ where: { code: insuranceCode } });
            if (!insurance) {
                console.log(`   ⚠️  Insurance ${insuranceCode} not found, skipping...`);
                continue;
            }

            for (const procCode of procedureCodes) {
                const procedure = await prisma.procedure.findUnique({ where: { code: procCode } });
                if (!procedure) {
                    console.log(`   ⚠️  Procedure ${procCode} not found, skipping...`);
                    continue;
                }

                // Create for Vieiralves (most insurances cover both clinics)
                await prisma.clinicInsuranceProcedure.create({
                    data: {
                        clinicId: vieiralves.id,
                        insuranceCode: insurance.code,
                        procedureCode: procedure.code,
                        price: 0, // Insurance procedures typically don't have price
                        isActive: true,
                        hasPackage: false
                    }
                });
            }

            console.log(`   ✅ Added ${procedureCodes.length} procedures to ${insurance.name}`);
        }

        // Step 5: Seed particular procedures
        console.log('\n🏥 Step 5: Creating particular procedures...');

        const particular = await prisma.insuranceCompany.findUnique({ where: { code: 'particular' } });
        if (!particular) {
            throw new Error('Particular insurance not found!');
        }

        // Vieiralves particular
        console.log('   Creating Vieiralves particular procedures...');
        for (const item of VIEIRALVES_PARTICULAR) {
            const procedure = await prisma.procedure.findUnique({ where: { code: item.procedureCode } });
            if (!procedure) {
                console.log(`   ⚠️  Procedure ${item.procedureCode} not found, skipping...`);
                continue;
            }

            await prisma.clinicInsuranceProcedure.create({
                data: {
                    clinicId: vieiralves.id,
                    insuranceCode: particular.code,
                    procedureCode: procedure.code,
                    price: item.price,
                    isActive: item.isActive,
                    hasPackage: item.hasPackage
                }
            });
            console.log(`   ✅ Vieiralves - ${procedure.name}: R$ ${item.price.toFixed(2)}`);
        }

        // São José particular (single price)
        console.log('   Creating São José particular procedures...');
        for (const item of SAOJOSE_PARTICULAR) {
            const procedure = await prisma.procedure.findUnique({ where: { code: item.procedureCode } });
            if (!procedure) {
                console.log(`   ⚠️  Procedure ${item.procedureCode} not found, skipping...`);
                continue;
            }

            await prisma.clinicInsuranceProcedure.create({
                data: {
                    clinicId: saojose.id,
                    insuranceCode: particular.code,
                    procedureCode: procedure.code,
                    price: item.price,
                    isActive: item.isActive,
                    hasPackage: item.hasPackage
                }
            });
            console.log(`   ✅ São José - ${procedure.name}: R$ ${item.price.toFixed(2)}`);
        }

        // São José packages - update existing records with package info
        console.log('   Adding package info to São José procedures...');
        for (const item of SAOJOSE_PACKAGES) {
            const procedure = await prisma.procedure.findUnique({ where: { code: item.procedureCode } });
            if (!procedure) {
                console.log(`   ⚠️  Procedure ${item.procedureCode} not found, skipping...`);
                continue;
            }

            // Update the existing record to add package information
            const existing = await prisma.clinicInsuranceProcedure.findFirst({
                where: {
                    clinicId: saojose.id,
                    insuranceCode: particular.code,
                    procedureCode: procedure.code
                }
            });

            if (existing) {
                await prisma.clinicInsuranceProcedure.update({
                    where: { id: existing.id },
                    data: {
                        hasPackage: true,
                        packageInfo: `Pacote: R$ ${item.price.toFixed(2)}`
                    }
                });
                console.log(`   ✅ São José - ${procedure.name}: Added package info (R$ ${item.price.toFixed(2)})`);
            } else {
                console.log(`   ⚠️  No existing record for ${procedure.name} at São José, skipping...`);
            }
        }

        console.log('\n✅ Database restructure completed successfully!');
        console.log('\n📊 Summary:');
        const procCount = await prisma.procedure.count();
        const insCount = await prisma.insuranceCompany.count();
        const assocCount = await prisma.clinicInsuranceProcedure.count();
        console.log(`   - Procedures: ${procCount}`);
        console.log(`   - Insurance companies: ${insCount}`);
        console.log(`   - Insurance-procedure associations: ${assocCount}`);

    } catch (error) {
        console.error('❌ Error during restructure:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .then(() => {
        console.log('\n🎉 All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
