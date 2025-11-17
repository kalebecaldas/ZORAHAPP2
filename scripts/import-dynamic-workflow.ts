import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function importDynamicWorkflow() {
  try {
    // Read the dynamic workflow JSON
    const workflowPath = path.resolve(process.cwd(), 'workflow_dinamico_completo.json');
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    
    console.log('Importing workflow:', workflowData.name);
    
    // Create the workflow
    const workflow = await prisma.workflow.create({
      data: {
        name: workflowData.name,
        description: workflowData.description,
        type: 'CONSULTATION',
        isActive: workflowData.isActive,
        config: {
          nodes: workflowData.nodes,
          connections: workflowData.connections
        }
      }
    });
    
    console.log('✅ Workflow created successfully:', workflow.id);
    
    // Set as default workflow by creating audit log with proper actor
    const firstUser = await prisma.user.findFirst();
    if (firstUser) {
      const auditLog = await prisma.auditLog.create({
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
      
      console.log('✅ Workflow set as default:', auditLog.id);
    } else {
      console.log('⚠️ No user found, workflow created but not set as default');
    }
    
    // Deactivate other workflows to ensure this one is used
    await prisma.workflow.updateMany({
      where: {
        id: {
          not: workflow.id
        }
      },
      data: {
        isActive: false
      }
    });
    
    console.log('✅ Other workflows deactivated');
    
  } catch (error) {
    console.error('Error importing workflow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importDynamicWorkflow();