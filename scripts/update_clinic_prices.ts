#!/usr/bin/env tsx
/**
 * Script para atualizar preços e pacotes corretos das clínicas
 * Baseado no arquivo src/infor_clinic.txt
 */

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function updatePrices() {
  console.log('🔄 Atualizando preços e pacotes das clínicas...\n')

  try {
    // Buscar clínicas
    const vieiralves = await prisma.clinic.findUnique({ where: { code: 'VIEIRALVES' } })
    const saoJose = await prisma.clinic.findUnique({ where: { code: 'SAO_JOSE' } })

    if (!vieiralves || !saoJose) {
      console.error('❌ Clínicas não encontradas!')
      return
    }

    console.log(`✅ Vieiralves: ${vieiralves.id}`)
    console.log(`✅ São José: ${saoJose.id}\n`)

    // ============================================
    // VIEIRALVES - Preços Particulares
    // ============================================
    console.log('📍 VIEIRALVES - Atualizando preços particulares...')

    const vieiralvesPrices = [
      { code: 'FISIO_ORTOPEDICA', price: 90, packages: [{ sessions: 10, price: 800 }] },
      { code: 'FISIO_NEUROLOGICA', price: 100, packages: [{ sessions: 10, price: 900 }] },
      { code: 'FISIO_RESPIRATORIA', price: 100, packages: [{ sessions: 10, price: 900 }] },
      { code: 'FISIO_PELVICA', price: 220, packages: [{ sessions: 10, price: 2000 }] },
      { code: 'CONSULTA_ORTOPEDISTA', price: 400, packages: [] },
      { code: 'AVALIACAO_ACUPUNTURA', price: 200, packages: [] },
      { code: 'ACUPUNTURA', price: 180, packages: [{ sessions: 10, price: 1600 }] },
      { code: 'AVALIACAO_FISIO_PELVICA', price: 250, packages: [] },
      { code: 'RPG', price: 120, packages: [{ sessions: 10, price: 1000 }] },
      { code: 'PILATES', price: 70, packages: [] }, // Sessão avulsa
      { code: 'QUIROPRAXIA', price: 120, packages: [] },
      { code: 'INFILTRACAO', price: 150, packages: [] },
    ]

    for (const item of vieiralvesPrices) {
      await prisma.clinicInsuranceProcedure.upsert({
        where: {
          clinicId_insuranceCode_procedureCode: {
            clinicId: vieiralves.id,
            insuranceCode: 'PARTICULAR',
            procedureCode: item.code
          }
        },
        update: {
          price: item.price,
          hasPackage: item.packages.length > 0,
          packageInfo: item.packages.length > 0 ? JSON.stringify(item.packages) : null,
          isActive: true
        },
        create: {
          clinicId: vieiralves.id,
          insuranceCode: 'PARTICULAR',
          procedureCode: item.code,
          price: item.price,
          hasPackage: item.packages.length > 0,
          packageInfo: item.packages.length > 0 ? JSON.stringify(item.packages) : null,
          isActive: true
        }
      })
      console.log(`  ✓ ${item.code}: R$ ${item.price}${item.packages.length > 0 ? ` + pacotes` : ''}`)
    }

    // ============================================
    // SÃO JOSÉ - Preços Particulares
    // ============================================
    console.log('\n📍 SÃO JOSÉ - Atualizando preços particulares...')

    const saoJosePrices = [
      { code: 'FISIO_ORTOPEDICA', price: 45, packages: [{ sessions: 10, price: 200 }] },
      { code: 'FISIO_NEUROLOGICA', price: 60, packages: [{ sessions: 10, price: 500 }] },
      { code: 'FISIO_RESPIRATORIA', price: 60, packages: [{ sessions: 10, price: 500 }] },
      { code: 'FISIO_POS_OPERATORIA', price: 60, packages: [{ sessions: 10, price: 500 }] },
      { code: 'ACUPUNTURA', price: 60, packages: [{ sessions: 10, price: 400 }] },
      { code: 'RPG', price: 50, packages: [{ sessions: 10, price: 350 }] },
      { code: 'CONSULTA_ORTOPEDISTA', price: 200, packages: [] },
      { code: 'CONSULTA_CLINICO_GERAL', price: 200, packages: [] },
    ]

    for (const item of saoJosePrices) {
      await prisma.clinicInsuranceProcedure.upsert({
        where: {
          clinicId_insuranceCode_procedureCode: {
            clinicId: saoJose.id,
            insuranceCode: 'PARTICULAR',
            procedureCode: item.code
          }
        },
        update: {
          price: item.price,
          hasPackage: item.packages.length > 0,
          packageInfo: item.packages.length > 0 ? JSON.stringify(item.packages) : null,
          isActive: true
        },
        create: {
          clinicId: saoJose.id,
          insuranceCode: 'PARTICULAR',
          procedureCode: item.code,
          price: item.price,
          hasPackage: item.packages.length > 0,
          packageInfo: item.packages.length > 0 ? JSON.stringify(item.packages) : null,
          isActive: true
        }
      })
      console.log(`  ✓ ${item.code}: R$ ${item.price}${item.packages.length > 0 ? ` + pacotes` : ''}`)
    }

    console.log('\n✅ Preços e pacotes atualizados com sucesso!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updatePrices()
