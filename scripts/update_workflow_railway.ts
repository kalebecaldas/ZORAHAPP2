import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateWorkflowOnRailway() {
  try {
    console.log('🔍 Buscando workflow ativo no Railway...');
    
    // Buscar workflow ativo (pode ser o de 36 nós ou outro)
    const workflow = await prisma.workflow.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!workflow) {
      console.log('❌ Nenhum workflow ativo encontrado!');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`✅ Workflow encontrado: ${workflow.id}`);
    console.log(`   Nome: ${workflow.name}`);
    
    const cfg = typeof workflow.config === 'string' ? JSON.parse(workflow.config) : (workflow.config || {});
    const nodes = Array.isArray(cfg?.nodes) ? cfg.nodes : [];
    const edges = Array.isArray(cfg?.edges) ? cfg.edges : [];
    
    console.log(`   Nós atuais: ${nodes.length}`);
    console.log(`   Conexões atuais: ${edges.length}`);
    
    // Verificar quais nós já existem
    const nodeIds = nodes.map((n: any) => n.id);
    
    // Nós necessários para o fluxo de cadastro sucesso
    const nodesForCadastroSucesso = [
      {
        id: 'action_get_procedimentos_insurance',
        type: 'ACTION',
        position: { x: 1000, y: 2200 },
        data: {
          action: 'get_procedures_by_insurance'
        }
      },
      {
        id: 'msg_procedimentos_insurance',
        type: 'MESSAGE',
        position: { x: 1000, y: 2330 },
        data: {
          message: '🩺 **Procedimentos disponíveis para ${paciente.convenio}:**\n\n${procedimentos_lista}\n\n💡 Você pode informar quais procedimentos deseja agendar enquanto aguarda o atendimento.'
        }
      },
      {
        id: 'transfer_to_queue',
        type: 'TRANSFER_HUMAN',
        position: { x: 1000, y: 2460 },
        data: {
          finalMessage: '⏳ **Você foi encaminhado para um de nossos atendentes!**\n\nEnquanto aguarda, você pode informar quais procedimentos deseja agendar.\nNossa equipe entrará em contato em breve para finalizar seu agendamento.'
        }
      }
    ];
    
    // Nós necessários para o fluxo de paciente encontrado
    const nodesForPacienteEncontrado = [
      {
        id: 'action_get_procedimentos_insurance_encontrado',
        type: 'ACTION',
        position: { x: 1000, y: 2200 },
        data: {
          action: 'get_procedures_by_insurance'
        }
      },
      {
        id: 'msg_procedimentos_insurance_encontrado',
        type: 'MESSAGE',
        position: { x: 1000, y: 2330 },
        data: {
          message: '🩺 **Procedimentos disponíveis para ${paciente.convenio}:**\n\n${procedimentos_lista}\n\n💡 Você pode informar quais procedimentos deseja agendar enquanto aguarda o atendimento.'
        }
      },
      {
        id: 'transfer_to_queue_encontrado',
        type: 'TRANSFER_HUMAN',
        position: { x: 1000, y: 2460 },
        data: {
          finalMessage: '⏳ **Você foi encaminhado para um de nossos atendentes!**\n\nEnquanto aguarda, você pode informar quais procedimentos deseja agendar.\nNossa equipe entrará em contato em breve para finalizar seu agendamento.'
        }
      }
    ];
    
    const allRequiredNodes = [...nodesForCadastroSucesso, ...nodesForPacienteEncontrado];
    const missingNodes = allRequiredNodes.filter(n => !nodeIds.includes(n.id));
    
    if (missingNodes.length === 0) {
      console.log('✅ Todos os nós necessários já existem!');
      console.log(`   Total de nós: ${nodes.length}`);
      await prisma.$disconnect();
      return;
    }
    
    console.log(`\n📝 Adicionando ${missingNodes.length} nós faltantes...`);
    
    // Adicionar nós faltantes
    nodes.push(...missingNodes);
    
    // Atualizar conexões
    const newEdges = [...edges];
    
    // Verificar se msg_cadastro_sucesso existe e tem conexão
    const cadastroSucessoNode = nodes.find((n: any) => n.id === 'msg_cadastro_sucesso');
    if (cadastroSucessoNode) {
      // Remover conexão antiga (se existir)
      const oldEdge = newEdges.find((e: any) => e.source === 'msg_cadastro_sucesso' && e.target === 'ask_procedimentos');
      if (oldEdge) {
        const index = newEdges.indexOf(oldEdge);
        newEdges.splice(index, 1);
        console.log('   Removida conexão antiga: msg_cadastro_sucesso -> ask_procedimentos');
      }
      
      // Adicionar novas conexões para fluxo de cadastro sucesso
      if (!newEdges.find((e: any) => e.source === 'msg_cadastro_sucesso' && e.target === 'action_get_procedimentos_insurance')) {
        newEdges.push({ source: 'msg_cadastro_sucesso', target: 'action_get_procedimentos_insurance' });
        console.log('   ✅ Adicionada: msg_cadastro_sucesso -> action_get_procedimentos_insurance');
      }
      if (!newEdges.find((e: any) => e.source === 'action_get_procedimentos_insurance' && e.target === 'msg_procedimentos_insurance')) {
        newEdges.push({ source: 'action_get_procedimentos_insurance', target: 'msg_procedimentos_insurance' });
        console.log('   ✅ Adicionada: action_get_procedimentos_insurance -> msg_procedimentos_insurance');
      }
      if (!newEdges.find((e: any) => e.source === 'msg_procedimentos_insurance' && e.target === 'transfer_to_queue')) {
        newEdges.push({ source: 'msg_procedimentos_insurance', target: 'transfer_to_queue' });
        console.log('   ✅ Adicionada: msg_procedimentos_insurance -> transfer_to_queue');
      }
    }
    
    // Verificar se msg_paciente_encontrado existe e tem conexão
    const pacienteEncontradoNode = nodes.find((n: any) => n.id === 'msg_paciente_encontrado');
    if (pacienteEncontradoNode) {
      // Remover conexão antiga (se existir)
      const oldEdge = newEdges.find((e: any) => e.source === 'msg_paciente_encontrado' && e.target === 'ask_procedimentos');
      if (oldEdge) {
        const index = newEdges.indexOf(oldEdge);
        newEdges.splice(index, 1);
        console.log('   Removida conexão antiga: msg_paciente_encontrado -> ask_procedimentos');
      }
      
      // Adicionar novas conexões para fluxo de paciente encontrado
      if (!newEdges.find((e: any) => e.source === 'msg_paciente_encontrado' && e.target === 'action_get_procedimentos_insurance_encontrado')) {
        newEdges.push({ source: 'msg_paciente_encontrado', target: 'action_get_procedimentos_insurance_encontrado' });
        console.log('   ✅ Adicionada: msg_paciente_encontrado -> action_get_procedimentos_insurance_encontrado');
      }
      if (!newEdges.find((e: any) => e.source === 'action_get_procedimentos_insurance_encontrado' && e.target === 'msg_procedimentos_insurance_encontrado')) {
        newEdges.push({ source: 'action_get_procedimentos_insurance_encontrado', target: 'msg_procedimentos_insurance_encontrado' });
        console.log('   ✅ Adicionada: action_get_procedimentos_insurance_encontrado -> msg_procedimentos_insurance_encontrado');
      }
      if (!newEdges.find((e: any) => e.source === 'msg_procedimentos_insurance_encontrado' && e.target === 'transfer_to_queue_encontrado')) {
        newEdges.push({ source: 'msg_procedimentos_insurance_encontrado', target: 'transfer_to_queue_encontrado' });
        console.log('   ✅ Adicionada: msg_procedimentos_insurance_encontrado -> transfer_to_queue_encontrado');
      }
    }
    
    // Atualizar config
    cfg.nodes = nodes;
    cfg.edges = newEdges;
    
    // Salvar no banco
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: {
        config: cfg
      }
    });
    
    console.log(`\n✅ Workflow atualizado com sucesso!`);
    console.log(`   Total de nós: ${nodes.length}`);
    console.log(`   Total de conexões: ${newEdges.length}`);
    console.log(`   Nós adicionados: ${missingNodes.map(n => n.id).join(', ')}`);
    
  } catch (error) {
    console.error('❌ Erro ao atualizar workflow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateWorkflowOnRailway();

