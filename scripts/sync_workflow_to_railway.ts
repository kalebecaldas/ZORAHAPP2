import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function syncWorkflowToRailway() {
  try {
    console.log('🔄 Sincronizando workflow local para Railway...\n');
    
    // 1. Buscar workflow local ativo
    console.log('📥 Lendo workflow local...');
    const workflowLocal = await prisma.workflow.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!workflowLocal) {
      console.log('❌ Nenhum workflow ativo encontrado localmente!');
      await prisma.$disconnect();
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
    
    // 2. Buscar workflow no Railway (mesmo ID ou workflow ativo)
    console.log('📤 Procurando workflow no Railway...');
    let workflowRailway = await prisma.workflow.findUnique({
      where: { id: workflowLocal.id }
    });
    
    // Se não encontrar pelo ID, buscar workflow ativo
    if (!workflowRailway) {
      workflowRailway = await prisma.workflow.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });
      
      if (workflowRailway) {
        console.log(`⚠️  Workflow local (${workflowLocal.id}) não encontrado no Railway.`);
        console.log(`   Encontrado workflow ativo diferente: ${workflowRailway.id}`);
        console.log(`   Vamos atualizar este workflow com os dados do local.\n`);
      }
    } else {
      console.log(`✅ Workflow encontrado no Railway: ${workflowRailway.id}\n`);
    }
    
    // 3. Fazer backup do workflow atual no Railway (se existir)
    if (workflowRailway) {
      const backupPath = path.join(process.cwd(), `workflow_railway_backup_${Date.now()}.json`);
      const backupData = {
        id: workflowRailway.id,
        name: workflowRailway.name,
        description: workflowRailway.description,
        isActive: workflowRailway.isActive,
        config: typeof workflowRailway.config === 'string' 
          ? JSON.parse(workflowRailway.config) 
          : workflowRailway.config
      };
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`💾 Backup do workflow Railway salvo em: ${path.basename(backupPath)}\n`);
    }
    
    // 4. Atualizar ou criar workflow no Railway
    if (workflowRailway) {
      // Atualizar workflow existente
      console.log('🔄 Atualizando workflow no Railway...');
      await prisma.workflow.update({
        where: { id: workflowRailway.id },
        data: {
          name: workflowLocal.name,
          description: workflowLocal.description,
          config: cfg,
          isActive: workflowLocal.isActive
        }
      });
      console.log(`✅ Workflow ${workflowRailway.id} atualizado com sucesso!\n`);
    } else {
      // Criar novo workflow
      console.log('➕ Criando novo workflow no Railway...');
      const newWorkflow = await prisma.workflow.create({
        data: {
          id: workflowLocal.id,
          name: workflowLocal.name,
          description: workflowLocal.description,
          config: cfg,
          isActive: workflowLocal.isActive
        }
      });
      console.log(`✅ Workflow ${newWorkflow.id} criado com sucesso!\n`);
    }
    
    // 5. Verificar resultado
    const updatedWorkflow = await prisma.workflow.findUnique({
      where: { id: workflowRailway?.id || workflowLocal.id }
    });
    
    if (updatedWorkflow) {
      const updatedCfg = typeof updatedWorkflow.config === 'string' 
        ? JSON.parse(updatedWorkflow.config) 
        : (updatedWorkflow.config || {});
      const updatedNodes = Array.isArray(updatedCfg?.nodes) ? updatedCfg.nodes : [];
      const updatedEdges = Array.isArray(updatedCfg?.edges) ? updatedCfg.edges : [];
      
      console.log('📊 Resultado final:');
      console.log(`   ID: ${updatedWorkflow.id}`);
      console.log(`   Nome: ${updatedWorkflow.name}`);
      console.log(`   Nós: ${updatedNodes.length}`);
      console.log(`   Conexões: ${updatedEdges.length}`);
      console.log(`   Ativo: ${updatedWorkflow.isActive}`);
      console.log('\n✅ Sincronização concluída com sucesso!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao sincronizar workflow:', error);
    if (error instanceof Error) {
      console.error('   Mensagem:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

syncWorkflowToRailway();

