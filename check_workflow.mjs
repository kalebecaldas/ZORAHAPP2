import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando workflows ativos...\n');
  
  const workflows = await prisma.workflow.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  
  console.log(`Total workflows ativos: ${workflows.length}\n`);
  
  for (const wf of workflows) {
    console.log(`📋 Workflow: ${wf.name}`);
    console.log(`   ID: ${wf.id}`);
    console.log(`   Criado: ${new Date(wf.createdAt).toLocaleString('pt-BR')}`);
    
    let config;
    try {
      config = typeof wf.config === 'string' ? JSON.parse(wf.config) : wf.config;
    } catch {
      config = wf.config;
    }
    
    const nodes = Array.isArray(config?.nodes) ? config.nodes : [];
    console.log(`   Total de nodes: ${nodes.length}`);
    
    // Procurar node msg_cadastro_sucesso
    const cadastroSucessoNode = nodes.find(n => n.id === 'msg_cadastro_sucesso');
    if (cadastroSucessoNode) {
      console.log(`   ✅ Tem node msg_cadastro_sucesso`);
      const msg = cadastroSucessoNode.content?.message || cadastroSucessoNode.data?.message || '';
      if (msg) {
        console.log(`      Mensagem (primeiros 200 chars):`);
        console.log(`      "${msg.substring(0, 200)}..."`);
      }
    }
    
    console.log('');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
