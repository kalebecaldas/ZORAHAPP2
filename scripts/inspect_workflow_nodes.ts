import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectWorkflow() {
  console.log('🔍 Inspecionando nós do workflow...\n');
  
  try {
    const workflow = await prisma.workflow.findFirst({ where: { isActive: true } });
    
    if (!workflow) {
      console.log('❌ Nenhum workflow ativo encontrado');
      return;
    }
    
    console.log(`📋 Workflow: ${workflow.name}\n`);
    
    const config = typeof workflow.config === 'string' 
      ? JSON.parse(workflow.config) 
      : workflow.config as any;
    
    const nodes = config?.nodes || [];
    const edges = config?.edges || [];
    
    // Find nodes related to welcome message
    console.log('🔍 Procurando nós com mensagem "Você pode perguntar sobre consultas"...\n');
    
    const welcomeNodes = nodes.filter((n: any) => {
      const content = n.data?.message || n.data?.text || n.content?.message || n.content?.text || '';
      return content.includes('Você pode perguntar') || content.includes('consultas');
    });
    
    if (welcomeNodes.length > 0) {
      console.log(`✅ Encontrados ${welcomeNodes.length} nó(s):\n`);
      
      for (const node of welcomeNodes) {
        console.log(`📌 Nó ID: ${node.id}`);
        console.log(`   Tipo: ${node.type}`);
        console.log(`   Mensagem: ${node.data?.message || node.data?.text || node.content?.message || node.content?.text || 'N/A'}`);
        
        // Find connections TO this node
        const incomingEdges = edges.filter((e: any) => e.target === node.id);
        if (incomingEdges.length > 0) {
          console.log(`   Recebe de:`);
          incomingEdges.forEach((e: any) => {
            const sourceNode = nodes.find((n: any) => n.id === e.source);
            console.log(`      - ${e.source} (${sourceNode?.type || 'unknown'})`);
          });
        }
        
        // Find connections FROM this node
        const outgoingEdges = edges.filter((e: any) => e.source === node.id);
        if (outgoingEdges.length > 0) {
          console.log(`   Conecta para:`);
          outgoingEdges.forEach((e: any) => {
            const targetNode = nodes.find((n: any) => n.id === e.target);
            console.log(`      - ${e.target} (${targetNode?.type || 'unknown'})`);
          });
        } else {
          console.log(`   ⚠️  Sem conexões de saída (nó órfão)`);
        }
        
        console.log('');
      }
    } else {
      console.log('❌ Nenhum nó encontrado com essa mensagem');
    }
    
    // Check clinic_selection node specifically
    console.log('\n🔍 Verificando nó clinic_selection...\n');
    const clinicNode = nodes.find((n: any) => n.id === 'clinic_selection');
    if (clinicNode) {
      console.log(`📌 clinic_selection encontrado:`);
      console.log(`   Tipo: ${clinicNode.type}`);
      console.log(`   Data:`, JSON.stringify(clinicNode.data, null, 2));
      console.log(`   Content:`, JSON.stringify(clinicNode.content, null, 2));
      
      const outgoing = edges.filter((e: any) => e.source === 'clinic_selection');
      console.log(`\n   Conexões de saída (${outgoing.length}):`);
      outgoing.forEach((e: any) => {
        const targetNode = nodes.find((n: any) => n.id === e.target);
        console.log(`      → ${e.target} (${targetNode?.type || 'unknown'}) [port: ${e.data?.port || e.sourceHandle || 'default'}]`);
      });
    }
    
    // Check gpt_welcome node
    console.log('\n🔍 Verificando nó gpt_welcome...\n');
    const welcomeNode = nodes.find((n: any) => n.id === 'gpt_welcome');
    if (welcomeNode) {
      console.log(`📌 gpt_welcome encontrado:`);
      console.log(`   Tipo: ${welcomeNode.type}`);
      console.log(`   Mensagem: ${welcomeNode.data?.message || welcomeNode.content?.message || 'N/A'}`);
      
      const incoming = edges.filter((e: any) => e.target === 'gpt_welcome');
      const outgoing = edges.filter((e: any) => e.source === 'gpt_welcome');
      
      console.log(`   Conexões de entrada: ${incoming.length}`);
      incoming.forEach((e: any) => {
        console.log(`      ← ${e.source}`);
      });
      
      console.log(`   Conexões de saída: ${outgoing.length}`);
      outgoing.forEach((e: any) => {
        console.log(`      → ${e.target}`);
      });
      
      if (incoming.length === 0 && outgoing.length === 0) {
        console.log(`   ✅ Nó está isolado (bom!)`);
      }
    } else {
      console.log('❌ Nó gpt_welcome não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectWorkflow();

