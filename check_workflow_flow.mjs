import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const wf = await prisma.workflow.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!wf) {
    console.log('Nenhum workflow ativo');
    return;
  }
  
  let config = typeof wf.config === 'string' ? JSON.parse(wf.config) : wf.config;
  const nodes = config?.nodes || [];
  const edges = config?.edges || config?.connections || [];
  
  // Encontrar msg_cadastro_sucesso
  const cadastroNode = nodes.find(n => n.id === 'msg_cadastro_sucesso');
  
  if (!cadastroNode) {
    console.log('Node msg_cadastro_sucesso não encontrado');
    return;
  }
  
  console.log('📋 Node: msg_cadastro_sucesso');
  console.log('Tipo:', cadastroNode.type);
  console.log('Mensagem:', (cadastroNode.content?.message || cadastroNode.data?.message || '').substring(0, 300));
  console.log('');
  
  // Encontrar próximos nodes
  const nextEdges = edges.filter(e => e.source === 'msg_cadastro_sucesso');
  
  console.log(`Próximos nodes (${nextEdges.length}):`);
  nextEdges.forEach(edge => {
    const targetNode = nodes.find(n => n.id === edge.target);
    if (targetNode) {
      console.log(`  → ${edge.target} (${targetNode.type})`);
      const msg = targetNode.content?.message || targetNode.data?.message || '';
      if (msg && msg.includes('Procedimentos')) {
        console.log(`     📌 MENSAGEM: ${msg.substring(0, 200)}`);
      }
    }
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
