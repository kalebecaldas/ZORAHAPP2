import prisma from '../api/prisma/client.js'

async function migrateClinicProcedures() {
    console.log('🔄 Starting migration of ClinicProcedure data...\n')

    // Get all clinics
    const clinics = await (prisma as any).clinic.findMany()
    console.log(`📍 Found ${clinics.length} clinics\n`)

    for (const clinic of clinics) {
        console.log(`\n📍 Processing clinic: ${clinic.name} (${clinic.code})`)

        // Get unique procedures for this clinic from ClinicInsuranceProcedure
        const existingProcedures = await (prisma as any).clinicInsuranceProcedure.findMany({
            where: { clinicId: clinic.id },
            include: { procedure: true },
            distinct: ['procedureCode']
        })

        console.log(`   Found ${existingProcedures.length} unique procedures`)

        // Calculate average price for each procedure across all insurances
        for (const cip of existingProcedures) {
            const allPrices = await (prisma as any).clinicInsuranceProcedure.findMany({
                where: {
                    clinicId: clinic.id,
                    procedureCode: cip.procedureCode
                },
                select: { price: true }
            })

            const avgPrice = allPrices.reduce((sum: number, p: any) => sum + p.price, 0) / allPrices.length

            // Check if already exists
            const existing = await (prisma as any).clinicProcedure.findFirst({
                where: {
                    clinicId: clinic.id,
                    procedureCode: cip.procedureCode
                }
            })

            if (!existing) {
                await (prisma as any).clinicProcedure.create({
                    data: {
                        clinicId: clinic.id,
                        procedureCode: cip.procedureCode,
                        isActive: true,
                        defaultPrice: Math.round(avgPrice * 100) / 100,
                        notes: `Migrated from existing insurance procedures (avg: R$ ${avgPrice.toFixed(2)})`
                    }
                })
                console.log(`   ✅ Added: ${cip.procedure.name} (avg price: R$ ${avgPrice.toFixed(2)})`)
            } else {
                console.log(`   ⏭️  Skipped: ${cip.procedure.name} (already exists)`)
            }
        }
    }

    // Summary
    console.log('\n\n📊 Migration Summary:')
    const totalClinicProcedures = await (prisma as any).clinicProcedure.count()
    console.log(`   Total ClinicProcedure records: ${totalClinicProcedures}`)

    for (const clinic of clinics) {
        const count = await (prisma as any).clinicProcedure.count({
            where: { clinicId: clinic.id }
        })
        console.log(`   ${clinic.name}: ${count} procedures`)
    }

    console.log('\n✅ Migration completed successfully!\n')
}

migrateClinicProcedures()
    .catch((e) => {
        console.error('❌ Migration failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await (prisma as any).$disconnect()
    })
