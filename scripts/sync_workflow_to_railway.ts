import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function syncWorkflowToRailway() {
  try {
    console.log('🔄 Preparando workflow para sincronização com Railway...\n');
    
    // Verificar se estamos no Railway ou local
    const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.DATABASE_URL?.includes('railway.internal');
    
    if (isRailway) {
      console.log('⚠️  Detectado ambiente Railway.');
      console.log('   Este script deve ser executado LOCALMENTE primeiro.');
      console.log('   Execute: npm run sync:workflow:railway (sem railway run)\n');
      return;
    }
    
    // 1. Buscar workflow local ativo (usando banco local)
    console.log('📥 Lendo workflow do banco LOCAL...');
    const prisma = new PrismaClient();
    
    const workflowLocal = await prisma.workflow.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    await prisma.$disconnect();
    
    if (!workflowLocal) {
      console.log('❌ Nenhum workflow ativo encontrado localmente!');
      return;
    }
    
    const cfg = typeof workflowLocal.config === 'string' 
      ? JSON.parse(workflowLocal.config) 
      : (workflowLocal.config || {});
    
    const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : [];
    const edges = Array.isArray(cfg?.edges) ? cfg.edges : [];
    
    console.log(`✅ Workflow local encontrado:`);
    console.log(`   ID: ${workflowLocal.id}`);
    console.log(`   Nome: ${workflowLocal.name}`);
    console.log(`   Nós: ${nodes.length}`);
    console.log(`   Conexões: ${edges.length}`);
    console.log(`   Ativo: ${workflowLocal.isActive}\n`);
    
    // 2. Salvar workflow local em arquivo JSON temporário
    const tempFile = path.join(process.cwd(), 'workflow_to_sync.json');
    const workflowData = {
      id: workflowLocal.id,
      name: workflowLocal.name,
      description: workflowLocal.description,
      isActive: workflowLocal.isActive,
      config: cfg
    };
    fs.writeFileSync(tempFile, JSON.stringify(workflowData, null, 2));
    console.log(`💾 Workflow local salvo em: ${path.basename(tempFile)}\n`);
    
    console.log('✅ Workflow preparado com sucesso!');
    console.log('\n📤 Próximo passo: Execute no Railway:');
    console.log('   railway run npm run sync:workflow:railway:upload\n');
    
  } catch (error) {
    console.error('❌ Erro ao preparar workflow:', error);
    if (error instanceof Error) {
      console.error('   Mensagem:', error.message);
    }
  }
}

syncWorkflowToRailway();
