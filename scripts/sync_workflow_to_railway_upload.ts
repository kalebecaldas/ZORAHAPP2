import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Criar Prisma Client
// IMPORTANTE: Este script deve ser executado DENTRO do Railway Shell do Dashboard
// O hostname postgres.railway.internal só funciona dentro do ambiente Railway
const prisma = new PrismaClient();

async function uploadWorkflowToRailway() {
  try {
    console.log('📤 Fazendo upload do workflow para Railway...\n');
    
    // Verificar se estamos no ambiente Railway
    const dbUrl = process.env.DATABASE_URL || '';
    const isRailwayInternal = dbUrl.includes('railway.internal');
    
    if (!isRailwayInternal) {
      console.log('⚠️  ATENÇÃO: Este script deve ser executado DENTRO do Railway Shell do Dashboard!');
      console.log('   O hostname postgres.railway.internal só funciona dentro do ambiente Railway.');
      console.log('   Acesse: Railway Dashboard > Seu Serviço > Shell\n');
      console.log('   DATABASE_URL atual:', dbUrl.substring(0, 50) + '...\n');
      return;
    }
    
    // 1. Ler arquivo temporário criado localmente
    const tempFile = path.join(process.cwd(), 'workflow_to_sync.json');
    
    if (!fs.existsSync(tempFile)) {
      console.log('❌ Arquivo workflow_to_sync.json não encontrado!');
      console.log('   Execute primeiro: npm run sync:workflow:railway (localmente)\n');
      await prisma.$disconnect();
      return;
    }
    
    const workflowData = JSON.parse(fs.readFileSync(tempFile, 'utf-8'));
    
    console.log('📥 Workflow lido do arquivo:');
    console.log(`   ID: ${workflowData.id}`);
    console.log(`   Nome: ${workflowData.name}`);
    console.log(`   Nós: ${Array.isArray(workflowData.config?.nodes) ? workflowData.config.nodes.length : 0}`);
    console.log(`   Conexões: ${Array.isArray(workflowData.config?.edges) ? workflowData.config.edges.length : 0}\n`);
    
    // 2. Buscar workflow no Railway
    console.log('🔍 Procurando workflow no Railway...');
    let workflowRailway = await prisma.workflow.findUnique({
      where: { id: workflowData.id }
    });
    
    // Se não encontrar pelo ID, buscar workflow ativo
    if (!workflowRailway) {
      workflowRailway = await prisma.workflow.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });
      
      if (workflowRailway) {
        console.log(`⚠️  Workflow local (${workflowData.id}) não encontrado no Railway.`);
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
          name: workflowData.name,
          description: workflowData.description,
          config: workflowData.config,
          isActive: workflowData.isActive
        }
      });
      console.log(`✅ Workflow ${workflowRailway.id} atualizado com sucesso!\n`);
    } else {
      // Criar novo workflow
      console.log('➕ Criando novo workflow no Railway...');
      const newWorkflow = await prisma.workflow.create({
        data: {
          id: workflowData.id,
          name: workflowData.name,
          description: workflowData.description,
          config: workflowData.config,
          isActive: workflowData.isActive
        }
      });
      console.log(`✅ Workflow ${newWorkflow.id} criado com sucesso!\n`);
    }
    
    // 5. Verificar resultado
    const updatedWorkflow = await prisma.workflow.findUnique({
      where: { id: workflowRailway?.id || workflowData.id }
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
      console.log('\n✅ Upload concluído com sucesso!');
      
      // Limpar arquivo temporário
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
        console.log(`🗑️  Arquivo temporário removido: ${path.basename(tempFile)}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao fazer upload do workflow:', error);
    if (error instanceof Error) {
      console.error('   Mensagem:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

uploadWorkflowToRailway();

