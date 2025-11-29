import 'dotenv/config';
import prisma from '../api/prisma/client.js';

/**
 * Script para deletar todos os workflows exceto o especificado
 * Executar no Railway: railway run npm run delete:workflows:railway <workflow_id>
 * OU via SSH: railway ssh -> npm run delete:workflows:railway <workflow_id>
 */

async function deleteAllWorkflowsExcept(keepWorkflowId: string) {
  console.log('🗑️  Iniciando limpeza de workflows...');
  console.log(`📌 Mantendo workflow: ${keepWorkflowId}`);

  try {
    // Verificar se o workflow a manter existe
    const workflowToKeep = await prisma.workflow.findUnique({
      where: { id: keepWorkflowId }
    });

    if (!workflowToKeep) {
      console.error(`❌ Workflow ${keepWorkflowId} não encontrado!`);
      console.log('\n📋 Workflows disponíveis:');
      const allWorkflows = await prisma.workflow.findMany({
        orderBy: { createdAt: 'desc' }
      });
      allWorkflows.forEach((w, idx) => {
        const nodeCount = Array.isArray((w.config as any)?.nodes) 
          ? (w.config as any).nodes.length 
          : 'N/A';
        console.log(`   ${idx + 1}. ${w.name} (${w.id}) - ${nodeCount} nós - ${w.isActive ? 'ATIVO' : 'inativo'}`);
      });
      process.exit(1);
    }

    console.log(`✅ Workflow encontrado: "${workflowToKeep.name}"`);
    const nodeCount = Array.isArray((workflowToKeep.config as any)?.nodes) 
      ? (workflowToKeep.config as any).nodes.length 
      : 'N/A';
    console.log(`   - Nós: ${nodeCount}`);
    console.log(`   - Ativo: ${workflowToKeep.isActive ? 'Sim' : 'Não'}`);
    
    // Contar workflows antes
    const totalBefore = await prisma.workflow.count();
    console.log(`\n📊 Total de workflows antes: ${totalBefore}`);

    // Listar workflows que serão deletados
    const workflowsToDelete = await prisma.workflow.findMany({
      where: {
        id: {
          not: keepWorkflowId
        }
      }
    });

    if (workflowsToDelete.length === 0) {
      console.log('✅ Nenhum workflow para deletar!');
      return;
    }

    console.log(`\n🗑️  Workflows que serão deletados (${workflowsToDelete.length}):`);
    workflowsToDelete.forEach((w, idx) => {
      const nodeCount = Array.isArray((w.config as any)?.nodes) 
        ? (w.config as any).nodes.length 
        : 'N/A';
      console.log(`   ${idx + 1}. ${w.name} (${w.id}) - ${nodeCount} nós`);
    });

    // Deletar todos os workflows exceto o especificado
    const result = await prisma.workflow.deleteMany({
      where: {
        id: {
          not: keepWorkflowId
        }
      }
    });

    console.log(`\n✅ ${result.count} workflow(s) deletado(s)`);

    // Garantir que o workflow mantido está ativo
    await prisma.workflow.update({
      where: { id: keepWorkflowId },
      data: { isActive: true }
    });

    // Verificar resultado
    const remaining = await prisma.workflow.count();
    const remainingWorkflow = await prisma.workflow.findUnique({
      where: { id: keepWorkflowId }
    });

    console.log(`\n📊 Resultado:`);
    console.log(`   - Workflows restantes: ${remaining}`);
    if (remainingWorkflow) {
      const nodeCount = Array.isArray((remainingWorkflow.config as any)?.nodes) 
        ? (remainingWorkflow.config as any).nodes.length 
        : 'N/A';
      console.log(`   - Workflow mantido: "${remainingWorkflow.name}" (${remainingWorkflow.id})`);
      console.log(`   - Nós: ${nodeCount}`);
      console.log(`   - Ativo: ${remainingWorkflow.isActive ? 'Sim' : 'Não'}`);
    }

    console.log('\n✅ Limpeza concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao deletar workflows:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Pegar ID do workflow da linha de comando
const workflowId = process.argv[2];

if (!workflowId) {
  console.error('❌ Por favor, forneça o ID do workflow a manter:');
  console.error('   npm run delete:workflows:railway <workflow_id>');
  console.error('\n   Exemplo:');
  console.error('   npm run delete:workflows:railway cmigcbzpd0000jy3cxyvhb02t');
  console.error('\n   Para executar no Railway:');
  console.error('   railway run npm run delete:workflows:railway cmigcbzpd0000jy3cxyvhb02t');
  process.exit(1);
}

deleteAllWorkflowsExcept(workflowId);

