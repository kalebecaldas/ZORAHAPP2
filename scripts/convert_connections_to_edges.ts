import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function convertConnectionsToEdges() {
  console.log('🔧 Convertendo connections para edges...\n');
  
  try {
    const workflows = await prisma.workflow.findMany();
    
    for (const wf of workflows) {
      console.log(`📋 Processando: ${wf.name}`);
      
      const config = typeof wf.config === 'string' 
        ? JSON.parse(wf.config) 
        : wf.config as any;
      
      const connections = config?.connections || [];
      let edges = config?.edges || [];
      
      if (edges.length > 0) {
        console.log(`   ✅ Já possui ${edges.length} edges\n`);
        continue;
      }
      
      if (!Array.isArray(connections) || connections.length === 0) {
        console.log(`   ⚠️  Sem connections para converter\n`);
        continue;
      }
      
      console.log(`   📝 Convertendo ${connections.length} connections...`);
      
      // Convert connections format to edges format
      edges = connections.map((conn: any) => ({
        id: conn.id || `e_${conn.source}_${conn.target}`,
        source: conn.source,
        target: conn.target,
        type: 'smoothstep',
        animated: false,
        data: {
          port: conn.sourcePort || 'main',
          condition: conn.condition
        }
      }));
      
      console.log(`   ✅ Criadas ${edges.length} edges`);
      
      // Update workflow with edges (keep connections for compatibility)
      await prisma.workflow.update({
        where: { id: wf.id },
        data: {
          config: {
            ...config,
            edges
          }
        }
      });
      
      console.log(`   ✅ Workflow atualizado\n`);
    }
    
    console.log('✅ Conversão concluída!');
    
    // Run verification again
    console.log('\n🔍 Verificando resultado...\n');
    const verifiedWorkflows = await prisma.workflow.findMany();
    
    for (const wf of verifiedWorkflows) {
      const config = typeof wf.config === 'string' 
        ? JSON.parse(wf.config) 
        : wf.config as any;
      
      console.log(`📋 ${wf.name}:`);
      console.log(`   Nodes: ${config?.nodes?.length || 0}`);
      console.log(`   Edges: ${config?.edges?.length || 0}`);
      console.log(`   Connections: ${config?.connections?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

convertConnectionsToEdges();

