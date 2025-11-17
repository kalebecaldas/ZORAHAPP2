// Import dynamic workflow with API calls
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function importDynamicWorkflow() {
  try {
    // Read the dynamic workflow JSON
    const workflowPath = path.join(__dirname, '..', 'workflow_dinamico_completo.json');
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    
    // Convert to internal format
    const internalConfig = {
      nodes: workflowData.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        content: node.data || {},
        position: node.position || { x: 0, y: 0 },
        connections: []
      })),
      edges: workflowData.connections.map((conn) => ({
        id: conn.id,
        source: conn.source,
        target: conn.target,
        data: {
          condition: conn.condition,
          port: conn.sourcePort
        }
      }))
    };
    
    // Build connections from edges
    internalConfig.nodes.forEach((node) => {
      const outgoingEdges = internalConfig.edges.filter((edge) => edge.source === node.id);
      node.connections = outgoingEdges.map((edge) => ({
        targetId: edge.target,
        condition: edge.data?.condition,
        port: edge.data?.port || 'main'
      }));
    });
    
    // Create the workflow
    const workflow = await prisma.workflow.create({
      data: {
        name: workflowData.name,
        description: workflowData.description,
        type: 'CONSULTATION',
        isActive: workflowData.isActive,
        config: internalConfig
      }
    });
    
    console.log('✅ Workflow dinâmico importado com sucesso!');
    console.log(`📋 Nome: ${workflow.name}`);
    console.log(`🆔 ID: ${workflow.id}`);
    console.log(`📊 Nós: ${internalConfig.nodes.length}`);
    console.log(`🔗 Conexões: ${internalConfig.edges.length}`);
    
  } catch (error) {
    console.error('❌ Erro ao importar workflow dinâmico:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importDynamicWorkflow();