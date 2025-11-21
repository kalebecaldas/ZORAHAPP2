import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Limpa o workflow ativo removendo:
 * - Nós não alcançáveis a partir do start
 * - Edges que apontam para nós removidos
 * - Campos antigos do config (connections, etc)
 */
async function cleanupWorkflow() {
  console.log('🧹 Iniciando limpeza do workflow...\n');

  try {
    const wf = await prisma.workflow.findFirst({ where: { isActive: true } });
    if (!wf) {
      console.log('❌ Nenhum workflow ativo encontrado');
      return;
    }

    console.log(`📋 Workflow: ${wf.name} (${wf.id})\n`);

    const cfg = typeof wf.config === 'string' ? JSON.parse(wf.config) : wf.config;
    const nodes = cfg?.nodes || [];
    const edges = cfg?.edges || [];

    console.log(`📊 Estado inicial:`);
    console.log(`   Nós: ${nodes.length}`);
    console.log(`   Edges: ${edges.length}`);

    // 1. Encontrar nós alcançáveis a partir do start
    const reachable = new Set<string>(['start']);
    let changed = true;
    let iterations = 0;
    
    while (changed && iterations < 100) {
      changed = false;
      edges.forEach((e: any) => {
        if (reachable.has(e.source) && !reachable.has(e.target)) {
          reachable.add(e.target);
          changed = true;
        }
      });
      iterations++;
    }

    const unreachableNodes = nodes.filter((n: any) => !reachable.has(n.id));
    
    console.log(`\n🔍 Análise:`);
    console.log(`   Nós alcançáveis: ${reachable.size}`);
    console.log(`   Nós não alcançáveis: ${unreachableNodes.length}`);
    
    if (unreachableNodes.length > 0) {
      console.log(`\n❌ Nós não alcançáveis que serão removidos:`);
      unreachableNodes.forEach((n: any) => {
        console.log(`   - ${n.id} (${n.type})`);
      });
    }

    // 2. Remover nós não alcançáveis
    const cleanedNodes = nodes.filter((n: any) => reachable.has(n.id));

    // 3. Remover edges que apontam para nós removidos ou vêm de nós removidos
    const cleanedEdges = edges.filter((e: any) => 
      reachable.has(e.source) && reachable.has(e.target)
    );

    // 4. Remover campos antigos do config
    const { connections, variables, metadata, ...cleanedConfig } = cfg;
    const removedFields: string[] = [];
    if (connections) removedFields.push('connections');
    if (variables) removedFields.push('variables');
    if (metadata) removedFields.push('metadata');

    console.log(`\n🧹 Limpeza:`);
    console.log(`   Nós removidos: ${nodes.length - cleanedNodes.length}`);
    console.log(`   Edges removidos: ${edges.length - cleanedEdges.length}`);
    if (removedFields.length > 0) {
      console.log(`   Campos removidos: ${removedFields.join(', ')}`);
    }

    // 5. Atualizar workflow
    await prisma.workflow.update({
      where: { id: wf.id },
      data: {
        config: {
          ...cleanedConfig,
          nodes: cleanedNodes,
          edges: cleanedEdges
        }
      }
    });

    console.log(`\n✅ Workflow limpo com sucesso!`);
    console.log(`\n📊 Estado final:`);
    console.log(`   Nós: ${cleanedNodes.length} (removidos: ${nodes.length - cleanedNodes.length})`);
    console.log(`   Edges: ${cleanedEdges.length} (removidos: ${edges.length - cleanedEdges.length})`);

    // 6. Verificar nós que ainda existem mas podem ser antigos
    const potentiallyOldNodes = ['service_menu', 'service_selection', 'gpt_welcome'];
    const stillExists = cleanedNodes.filter((n: any) => potentiallyOldNodes.includes(n.id));
    if (stillExists.length > 0) {
      console.log(`\n⚠️  Nós potencialmente antigos que ainda existem:`);
      stillExists.forEach((n: any) => {
        const hasConnections = cleanedEdges.some((e: any) => e.source === n.id || e.target === n.id);
        console.log(`   - ${n.id}: temConexões=${hasConnections}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro ao limpar workflow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupWorkflow();

