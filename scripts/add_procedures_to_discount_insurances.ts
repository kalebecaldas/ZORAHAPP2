import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Buscando convênios e procedimentos...');
    
    // Get all insurances with discount
    const discountInsurances = await prisma.insuranceCompany.findMany({
      where: {
        OR: [
          { discount: true },
          { discountPercentage: { gt: 0 } }
        ]
      }
    });

    console.log(`✅ Encontrados ${discountInsurances.length} convênios com desconto`);

    // Get all procedures
    const procedures = await prisma.procedure.findMany();
    console.log(`✅ Encontrados ${procedures.length} procedimentos`);

    // Get all clinics
    const clinics = await prisma.clinic.findMany();
    console.log(`✅ Encontradas ${clinics.length} clínicas`);

    if (discountInsurances.length === 0) {
      console.log('⚠️  Nenhum convênio com desconto encontrado. Atualizando convênios...');
      
      // Update insurances to have discount flag and 20% discount
      const insurancesToUpdate = await prisma.insuranceCompany.findMany({
        where: {
          code: {
            in: ['unimed', 'bradesco', 'sulamerica', 'amil', 'notredame', 'golden']
          }
        }
      });

      for (const insurance of insurancesToUpdate) {
        await prisma.insuranceCompany.update({
          where: { id: insurance.id },
          data: {
            discount: true,
            discountPercentage: 20
          }
        });
        console.log(`✅ Convênio ${insurance.name} atualizado com 20% de desconto`);
      }

      // Refresh the list
      const updatedInsurances = await prisma.insuranceCompany.findMany({
        where: { discount: true }
      });
      discountInsurances.push(...updatedInsurances);
    }

    let totalAdded = 0;
    let totalSkipped = 0;

    // For each clinic, insurance, and procedure combination
    for (const clinic of clinics) {
      for (const insurance of discountInsurances) {
        console.log(`\n📝 Processando ${clinic.displayName} - ${insurance.displayName}...`);
        
        for (const procedure of procedures) {
          try {
            // Check if already exists
            const existing = await prisma.clinicInsuranceProcedure.findUnique({
              where: {
                clinicId_insuranceCode_procedureCode: {
                  clinicId: clinic.id,
                  insuranceCode: insurance.code,
                  procedureCode: procedure.code
                }
              }
            });

            if (existing) {
              totalSkipped++;
              continue;
            }

            // Calculate discounted price (20% off base price)
            const discountedPrice = procedure.basePrice * 0.8; // 20% discount

            // Create the association
            await prisma.clinicInsuranceProcedure.create({
              data: {
                clinicId: clinic.id,
                insuranceCode: insurance.code,
                procedureCode: procedure.code,
                price: discountedPrice,
                isActive: true,
                hasPackage: false
              }
            });

            totalAdded++;
            console.log(`  ✅ Adicionado: ${procedure.name} - R$ ${procedure.basePrice.toFixed(2)} → R$ ${discountedPrice.toFixed(2)} (20% off)`);
          } catch (error: any) {
            if (error.code === 'P2002') {
              totalSkipped++;
            } else {
              console.error(`  ❌ Erro ao adicionar ${procedure.name}:`, error.message);
            }
          }
        }
      }
    }

    console.log('\n✅ Processo concluído!');
    console.log(`📊 Total adicionado: ${totalAdded}`);
    console.log(`📊 Total ignorado (já existente): ${totalSkipped}`);
    console.log(`📊 Total de convênios com desconto: ${discountInsurances.length}`);
    console.log(`📊 Total de procedimentos: ${procedures.length}`);
    console.log(`📊 Total de clínicas: ${clinics.length}`);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

