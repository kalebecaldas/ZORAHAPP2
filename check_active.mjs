import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const active = await prisma.workflow.count({ where: { isActive: true } });
console.log(`Workflows ativos: ${active}`);

await prisma.$disconnect();
