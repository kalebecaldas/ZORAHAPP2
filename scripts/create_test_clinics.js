// Create test clinics with procedures and insurances
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestClinics() {
  try {
    // Create Vieiralves clinic
    const vieiralves = await prisma.clinic.create({
      data: {
        code: 'vieiralves',
        name: 'Clínica Vieiralves',
        displayName: 'Unidade Vieiralves',
        address: 'Rua Salvador, 627',
        neighborhood: 'Vieiralves',
        city: 'Manaus',
        state: 'AM',
        zipCode: '69057-040',
        phone: '(92) 3232-3232',
        email: 'vieiralves@clinica.com',
        openingHours: {
          'Segunda-feira': '08:00-18:00',
          'Terça-feira': '08:00-18:00',
          'Quarta-feira': '08:00-18:00',
          'Quinta-feira': '08:00-18:00',
          'Sexta-feira': '08:00-18:00',
          'Sábado': '08:00-12:00'
        },
        specialties: ['Fisioterapia', 'Acupuntura', 'RPG', 'Pilates', 'Quiropraxia'],
        parkingAvailable: true,
        accessibility: {
          wheelchairAccessible: true,
          elevatorAvailable: true,
          accessibleParking: true,
          accessibleRestroom: true
        }
      }
    });

    // Create São José clinic
    const saojose = await prisma.clinic.create({
      data: {
        code: 'saojose',
        name: 'Clínica São José',
        displayName: 'Unidade São José',
        address: 'Rua São José, 123',
        neighborhood: 'Centro',
        city: 'Manaus',
        state: 'AM',
        zipCode: '69010-110',
        phone: '(92) 3232-3233',
        email: 'saojose@clinica.com',
        openingHours: {
          'Segunda-feira': '08:00-18:00',
          'Terça-feira': '08:00-18:00',
          'Quarta-feira': '08:00-18:00',
          'Quinta-feira': '08:00-18:00',
          'Sexta-feira': '08:00-18:00',
          'Sábado': '08:00-12:00'
        },
        specialties: ['Fisioterapia', 'Acupuntura', 'RPG', 'Pilates', 'Quiropraxia'],
        parkingAvailable: false,
        accessibility: {
          wheelchairAccessible: true,
          elevatorAvailable: false,
          accessibleParking: false,
          accessibleRestroom: true
        }
      }
    });

    console.log('✅ Clínicas criadas com sucesso!');
    console.log(`🏥 Vieiralves ID: ${vieiralves.id}`);
    console.log(`🏥 São José ID: ${saojose.id}`);

    // Add procedures to Vieiralves clinic
    const proceduresVieiralves = await prisma.clinicProcedure.createMany({
      data: [
        {
          clinicId: vieiralves.id,
          procedureCode: 'acupuntura',
          particularPrice: 120.00,
          insurancePrice: {
            'Unimed': 84.00,
            'Bradesco Saúde': 90.00,
            'Amil': 88.00,
            'SulAmérica': 92.00
          }
        },
        {
          clinicId: vieiralves.id,
          procedureCode: 'fisioterapia',
          particularPrice: 150.00,
          insurancePrice: {
            'Unimed': 105.00,
            'Bradesco Saúde': 112.50,
            'Amil': 110.00,
            'SulAmérica': 115.00
          }
        },
        {
          clinicId: vieiralves.id,
          procedureCode: 'rpg',
          particularPrice: 180.00,
          insurancePrice: {
            'Unimed': 126.00,
            'Bradesco Saúde': 135.00,
            'Amil': 132.00,
            'SulAmérica': 138.00
          }
        },
        {
          clinicId: vieiralves.id,
          procedureCode: 'pilates',
          particularPrice: 200.00,
          insurancePrice: {
            'Unimed': 140.00,
            'Bradesco Saúde': 150.00,
            'Amil': 147.00,
            'SulAmérica': 154.00
          }
        }
      ]
    });

    // Add procedures to São José clinic
    const proceduresSaoJose = await prisma.clinicProcedure.createMany({
      data: [
        {
          clinicId: saojose.id,
          procedureCode: 'acupuntura',
          particularPrice: 110.00,
          insurancePrice: {
            'Unimed': 77.00,
            'Bradesco Saúde': 82.50,
            'Amil': 80.75,
            'SulAmérica': 84.00
          }
        },
        {
          clinicId: saojose.id,
          procedureCode: 'fisioterapia',
          particularPrice: 140.00,
          insurancePrice: {
            'Unimed': 98.00,
            'Bradesco Saúde': 105.00,
            'Amil': 102.67,
            'SulAmérica': 107.33
          }
        },
        {
          clinicId: saojose.id,
          procedureCode: 'rpg',
          particularPrice: 170.00,
          insurancePrice: {
            'Unimed': 119.00,
            'Bradesco Saúde': 127.50,
            'Amil': 124.67,
            'SulAmérica': 130.33
          }
        },
        {
          clinicId: saojose.id,
          procedureCode: 'pilates',
          particularPrice: 190.00,
          insurancePrice: {
            'Unimed': 133.00,
            'Bradesco Saúde': 142.50,
            'Amil': 139.33,
            'SulAmérica': 145.67
          }
        }
      ]
    });

    console.log('✅ Procedimentos adicionados com sucesso!');

    // Add insurances to Vieiralves clinic
    const insurancesVieiralves = await prisma.clinicInsurance.createMany({
      data: [
        {
          clinicId: vieiralves.id,
          insuranceCode: 'Unimed',
          coveragePercentage: 70,
          copayment: 0,
          requiresPreAuthorization: false
        },
        {
          clinicId: vieiralves.id,
          insuranceCode: 'Bradesco Saúde',
          coveragePercentage: 75,
          copayment: 15.00,
          requiresPreAuthorization: true
        },
        {
          clinicId: vieiralves.id,
          insuranceCode: 'Amil',
          coveragePercentage: 73,
          copayment: 10.00,
          requiresPreAuthorization: false
        },
        {
          clinicId: vieiralves.id,
          insuranceCode: 'SulAmérica',
          coveragePercentage: 77,
          copayment: 20.00,
          requiresPreAuthorization: true
        }
      ]
    });

    // Add insurances to São José clinic
    const insurancesSaoJose = await prisma.clinicInsurance.createMany({
      data: [
        {
          clinicId: saojose.id,
          insuranceCode: 'Unimed',
          coveragePercentage: 70,
          copayment: 0,
          requiresPreAuthorization: false
        },
        {
          clinicId: saojose.id,
          insuranceCode: 'Bradesco Saúde',
          coveragePercentage: 75,
          copayment: 15.00,
          requiresPreAuthorization: true
        },
        {
          clinicId: saojose.id,
          insuranceCode: 'Amil',
          coveragePercentage: 73,
          copayment: 10.00,
          requiresPreAuthorization: false
        },
        {
          clinicId: saojose.id,
          insuranceCode: 'SulAmérica',
          coveragePercentage: 77,
          copayment: 20.00,
          requiresPreAuthorization: true
        }
      ]
    });

    console.log('✅ Convênios adicionados com sucesso!');
    console.log('\n🎉 Teste de clínicas concluído com sucesso!');
    console.log('Você pode agora testar o workflow com as clínicas criadas.');

  } catch (error) {
    console.error('❌ Erro ao criar clínicas de teste:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestClinics();