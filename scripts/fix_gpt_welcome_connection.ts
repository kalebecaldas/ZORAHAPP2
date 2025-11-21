import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixGptWelcomeConnection() {
  console.log('🔧 Removendo conexão inválida para gpt_welcome...\n');
  
  try {
    const workflow = await prisma.workflow.findFirst({ where: { isActive: true } });
    
    if (!workflow) {
      console.log('❌ Nenhum workflow ativo encontrado');
      return;
    }
    
    console.log(`📋 Workflow: ${workflow.name}`);
    
    const config = typeof workflow.config === 'string' 
      ? JSON.parse(workflow.config) 
      : workflow.config as any;
    
    const edges = config?.edges || [];
    
    console.log(`\nTotal edges antes: ${edges.length}`);
    
    // Remover edges que apontam para gpt_welcome
    const cleanedEdges = edges.filter((e: any) => e.target !== 'gpt_welcome');
    
    console.log(`Total edges depois: ${cleanedEdges.length}`);
    console.log(`Removidas: ${edges.length - cleanedEdges.length} edges\n`);
    
    // Garantir que clinic_selection aponte para gpt_classifier
    const hasClinicToClassifier = cleanedEdges.some((e: any) => 
      e.source === 'clinic_selection' && e.target === 'gpt_classifier' && e.data?.port === 'true'
    );
    
    if (!hasClinicToClassifier) {
      cleanedEdges.push({
        id: 'clinic_to_classifier_direct',
        source: 'clinic_selection',
        target: 'gpt_classifier',
        type: 'smoothstep',
        animated: false,
        data: {
          port: 'true'
        }
      });
      console.log('✅ Adicionada conexão clinic_selection (true) -> gpt_classifier');
    } else {
      console.log('✅ Conexão clinic_selection -> gpt_classifier já existe');
    }
    
    // Atualizar workflow
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: {
        config: {
          ...config,
          edges: cleanedEdges
        }
      }
    });
    
    console.log('\n✅ Workflow atualizado com sucesso!');
    console.log('\nAgora teste novamente: envie "quero agendar" no chat');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixGptWelcomeConnection();

