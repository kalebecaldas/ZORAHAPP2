import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkClinics() {
    const clinics = await prisma.clinic.findMany();
    console.log('Existing clinics:');
    clinics.forEach(c => console.log(`  - code: ${c.code}, name: ${c.name}, id: ${c.id}`));
    await prisma.$disconnect();
}

checkClinics();
