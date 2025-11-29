import 'dotenv/config';
import prisma from '../api/prisma/client.js';

/**
 * Script para deletar todos os workflows exceto o especificado
 * Uso: tsx scripts/delete_all_workflows_except.ts <workflow_id>
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
      process.exit(1);
    }

    console.log(`✅ Workflow encontrado: "${workflowToKeep.name}"`);
    
    // Contar workflows antes
    const totalBefore = await prisma.workflow.count();
    console.log(`📊 Total de workflows antes: ${totalBefore}`);

    // Deletar todos os workflows exceto o especificado
    const result = await prisma.workflow.deleteMany({
      where: {
        id: {
          not: keepWorkflowId
        }
      }
    });

    console.log(`✅ ${result.count} workflow(s) deletado(s)`);

    // Verificar resultado
    const remaining = await prisma.workflow.count();
    const remainingWorkflow = await prisma.workflow.findUnique({
      where: { id: keepWorkflowId }
    });

    console.log(`\n📊 Resultado:`);
    console.log(`   - Workflows restantes: ${remaining}`);
    if (remainingWorkflow) {
      console.log(`   - Workflow mantido: "${remainingWorkflow.name}" (${remainingWorkflow.id})`);
      console.log(`   - Ativo: ${remainingWorkflow.isActive ? 'Sim' : 'Não'}`);
      
      // Garantir que está ativo
      if (!remainingWorkflow.isActive) {
        await prisma.workflow.update({
          where: { id: keepWorkflowId },
          data: { isActive: true }
        });
        console.log(`   ✅ Workflow marcado como ativo`);
      }
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
  console.error('   tsx scripts/delete_all_workflows_except.ts <workflow_id>');
  console.error('\n   Exemplo:');
  console.error('   tsx scripts/delete_all_workflows_except.ts cmigcbzpd0000jy3cxyvhb02t');
  process.exit(1);
}

deleteAllWorkflowsExcept(workflowId);

