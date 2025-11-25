import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function importWorkflowV2() {
  try {
    console.log('🔧 Importando workflow v2 limpo...');
    
    // Read the workflow JSON
    const workflowPath = path.resolve(process.cwd(), 'workflow_v2_clean.json');
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    
    console.log(`📋 Nome: ${workflowData.name}`);
    console.log(`📊 Nodes: ${workflowData.nodes.length}`);
    console.log(`🔗 Edges: ${workflowData.edges.length}`);
    
    // Deactivate all existing workflows
    await prisma.workflow.updateMany({
      data: {
        isActive: false
      }
    });
    
    console.log('✅ Workflows anteriores desativados');
    
    // Create new workflow
    const workflow = await prisma.workflow.create({
      data: {
        name: workflowData.name,
        description: workflowData.description,
        type: 'CONSULTATION',
        isActive: true,
        config: {
          nodes: workflowData.nodes,
          edges: workflowData.edges
        }
      }
    });
    
    console.log('✅ Workflow v2 criado com sucesso!');
    console.log(`🆔 ID: ${workflow.id}`);
    
    // Set as default
    const firstUser = await prisma.user.findFirst();
    if (firstUser) {
      await prisma.auditLog.create({
        data: {
          action: 'DEFAULT_WORKFLOW',
          actorId: firstUser.id,
          details: {
            id: workflow.id,
            name: workflow.name,
            timestamp: new Date().toISOString()
          }
        }
      });
      
      console.log('✅ Definido como workflow padrão');
    }
    
    console.log('\n🎉 Importação concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao importar workflow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importWorkflowV2();

