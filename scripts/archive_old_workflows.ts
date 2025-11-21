import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Arquiva workflows antigos criando uma cópia com sufixo _archived
 * e marcando como inativo
 */
async function archiveOldWorkflows() {
  console.log('📦 Iniciando arquivamento de workflows antigos...\n');

  try {
    // Buscar workflow ativo atual
    const activeWorkflow = await prisma.workflow.findFirst({ 
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' }
    });

    if (!activeWorkflow) {
      console.log('❌ Nenhum workflow ativo encontrado');
      return;
    }

    console.log(`📋 Workflow ativo: ${activeWorkflow.name} (${activeWorkflow.id})\n`);

    // Buscar todos os workflows inativos
    const inactiveWorkflows = await prisma.workflow.findMany({
      where: { 
        isActive: false,
        id: { not: activeWorkflow.id }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Workflows inativos encontrados: ${inactiveWorkflows.length}\n`);

    if (inactiveWorkflows.length === 0) {
      console.log('✅ Nenhum workflow para arquivar');
      return;
    }

    // Criar cópias arquivadas
    let archived = 0;
    for (const wf of inactiveWorkflows) {
      try {
        const archivedName = `${wf.name}_archived_${new Date().toISOString().split('T')[0]}`;
        
        await prisma.workflow.create({
          data: {
            name: archivedName,
            description: `Arquivado de: ${wf.description || wf.name}`,
            type: wf.type,
            isActive: false,
            config: wf.config
          }
        });

        // Deletar workflow original
        await prisma.workflow.delete({
          where: { id: wf.id }
        });

        console.log(`✅ Arquivado: ${wf.name} -> ${archivedName}`);
        archived++;
      } catch (error) {
        console.error(`❌ Erro ao arquivar ${wf.name}:`, error);
      }
    }

    console.log(`\n✅ Arquivamento concluído: ${archived} workflow(s) arquivado(s)`);

  } catch (error) {
    console.error('❌ Erro ao arquivar workflows:', error);
  } finally {
    await prisma.$disconnect();
  }
}

archiveOldWorkflows();

