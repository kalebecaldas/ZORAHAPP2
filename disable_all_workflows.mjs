import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.workflow.updateMany({
    where: { isActive: true },
    data: { isActive: false }
  });
  
  console.log(`✅ Desativados ${result.count} workflows`);
  
  const active = await prisma.workflow.findMany({
    where: { isActive: true }
  });
  
  console.log(`Workflows ativos agora: ${active.length}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
