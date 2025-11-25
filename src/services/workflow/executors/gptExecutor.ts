import OpenAI from 'openai';
import { WorkflowNode, WorkflowExecutionContext, ConnectionMap, NodeExecutionResult } from '../core/types';

/**
 * Executes a GPT_RESPONSE node
 * GPT_RESPONSE nodes use GPT to classify user intent or generate responses
 */
export async function executeGPTNode(
  node: WorkflowNode,
  context: WorkflowExecutionContext,
  connections: ConnectionMap
): Promise<NodeExecutionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  console.log(`🤖 [GPT] Starting GPT node execution: ${node.id}`);
  
  if (!apiKey) {
    console.error('🤖 [GPT] OPENAI_API_KEY not configured');
    context.workflowLogs.push('❌ OPENAI_API_KEY não configurada');
    return { 
      nextNodeId: undefined, 
      response: 'Desculpe, serviço temporariamente indisponível.', 
      shouldStop: true 
    };
  }
  
  // Get user message
  const userMessage = (context.message || '').trim();
  
  // Check for generic/empty messages
  const genericMessages = ['oi', 'olá', 'ola', 'hey', 'hi', 'hello', 'ok', 'okay', 'beleza'];
  const isGenericMessage = genericMessages.some(g => 
    userMessage.toLowerCase() === g || 
    userMessage.toLowerCase().length <= 10 && userMessage.toLowerCase().includes(g)
  );
  
  if (!userMessage || isGenericMessage) {
    console.log(`🤖 [GPT] Skipping GPT for generic/empty message: "${userMessage}"`);
    return { 
      nextNodeId: undefined, 
      response: '', 
      shouldStop: true 
    };
  }
  
  // Check for clinic selection response (shouldn't be processed by GPT)
  const isClinicSelection = ['1', '2', 'um', 'dois'].includes(userMessage.toLowerCase()) ||
                           ['vieiralves', 'vieira', 'sao jose', 'são josé'].some(k => 
                             userMessage.toLowerCase().includes(k)
                           );
  
  if (isClinicSelection && !context.userData.selectedClinic) {
    console.log(`🤖 [GPT] Skipping GPT for clinic selection: "${userMessage}"`);
    return { 
      nextNodeId: undefined, 
      response: '', 
      shouldStop: true 
    };
  }
  
  try {
    const client = new OpenAI({ apiKey });
    const clinicCode = context.userData.selectedClinic || context.userData.clinicCode || 'vieiralves';
    
    // Import clinic data for context
    const { formatClinicDataForGPT } = await import('../utils/clinicDataFormatter');
    const clinicContext = formatClinicDataForGPT(clinicCode);
    
    const systemPrompt = node.content.systemPrompt || 
      `Você é um classificador de intenção para clínica de fisioterapia. Analise a mensagem do usuário e classifique em UMA das opções:

1) VALORES - perguntas sobre preços, valores particulares, pacotes
2) CONVÊNIOS - perguntas sobre convênios aceitos, planos de saúde, cobertura
3) LOCALIZAÇÃO - perguntas sobre endereço, como chegar, horários, contato
4) PROCEDIMENTO - perguntas sobre o que é um procedimento, benefícios, duração, indicações
5) AGENDAR - desejo de marcar consulta, agendar, marcar horário (ex: "quero agendar", "quero gendar", "marcar consulta")
6) ATENDENTE - pedido para falar com humano, atendente, pessoa

IMPORTANTE: "quero agendar", "quero gendar" (com erro de digitação), "marcar", "agendar consulta" = SEMPRE porta 5 (AGENDAR).

CONTEXTO DA CLÍNICA (para referência):
${clinicContext}

Responda APENAS com JSON no formato {"intent_port":"<1|2|3|4|5|6>","brief":"<mensagem curta>","confidence":<0..1>}.`;
    
    // Build conversation history
    const historyContext = context.conversationHistory
      .slice(-4)
      .map(h => `${h.role === 'user' ? 'Usuário' : 'Bot'}: ${h.content}`)
      .join('\n');
    
    const contextInfo = context.userData.lastTopic ? 
      `\n\nContexto: O usuário estava perguntando sobre ${context.userData.lastTopic}.` : '';
    
    const prompt = `${systemPrompt}\n\nHistórico recente:\n${historyContext}${contextInfo}\n\nMensagem atual: "${userMessage}"`;
    
    // Log GPT call details
    context.workflowLogs.push(`🤖 [GPT] ==========================================`);
    context.workflowLogs.push(`🤖 [GPT] 📨 MENSAGEM DO USUÁRIO: "${userMessage}"`);
    context.workflowLogs.push(`🤖 [GPT] 📋 HISTÓRICO (últimas 4 mensagens):`);
    context.workflowLogs.push(historyContext || '(sem histórico)');
    context.workflowLogs.push(`🤖 [GPT] 🏥 CLÍNICA SELECIONADA: ${context.userData.selectedClinic || 'nenhuma'}`);
    context.workflowLogs.push(`🤖 [GPT] 📝 ÚLTIMO TÓPICO: ${context.userData.lastTopic || 'nenhum'}`);
    context.workflowLogs.push(`🤖 [GPT] ⏳ Chamando GPT-4o...`);
    
    console.log(`🤖 [GPT] Calling GPT with message: "${userMessage}"`);
    
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Responda apenas com JSON válido sem texto extra.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      max_tokens: 100
    }, { timeout: 30000 });
    
    let content = completion.choices?.[0]?.message?.content || '';
    
    context.workflowLogs.push(`🤖 [GPT] 📥 RESPOSTA RAW DO GPT:`);
    context.workflowLogs.push(content);
    
    // Clean up markdown code blocks
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
      context.workflowLogs.push(`🤖 [GPT] ✅ JSON PARSEADO COM SUCESSO:`);
      context.workflowLogs.push(JSON.stringify(parsed, null, 2));
    } catch (e) {
      context.workflowLogs.push(`🤖 [GPT] ❌ ERRO AO PARSEAR JSON: ${e}`);
      
      // Try to extract intent_port from text
      const match = content.match(/"intent_port"\s*:\s*"([1-6])"/);
      if (match) {
        parsed = {
          intent_port: match[1],
          confidence: 0.7,
          brief: 'Intenção detectada'
        };
        context.workflowLogs.push(`🤖 [GPT] Extraído intent_port: ${match[1]}`);
      } else {
        context.workflowLogs.push(`🤖 [GPT] Não foi possível extrair intent_port`);
        return {
          nextNodeId: undefined,
          response: 'Não entendi. Você quer saber sobre valores, convênios, localização ou agendar?',
          shouldStop: true
        };
      }
    }
    
    const port = String(parsed.intent_port || '').trim();
    const confidence = Number(parsed.confidence ?? 0.5);
    const brief = String(parsed.brief || '').trim();
    const threshold = Number(process.env.GPT_CONFIDENCE_THRESHOLD || 0.5);
    
    context.workflowLogs.push(`🤖 [GPT] 📊 RESULTADO DA CLASSIFICAÇÃO:`);
    context.workflowLogs.push(`🤖 [GPT]    Porta selecionada: ${port || 'NENHUMA'}`);
    context.workflowLogs.push(`🤖 [GPT]    Confiança: ${confidence} (threshold: ${threshold})`);
    context.workflowLogs.push(`🤖 [GPT]    Brief: "${brief}"`);
    
    if (!['1', '2', '3', '4', '5', '6'].includes(port)) {
      context.workflowLogs.push(`🤖 [GPT] ❌ PORTA INVÁLIDA: "${port}"`);
      return {
        nextNodeId: undefined,
        response: 'Não entendi. Você quer saber sobre valores, convênios, localização ou agendar?',
        shouldStop: true
      };
    }
    
    if (confidence < threshold) {
      context.workflowLogs.push(`🤖 [GPT] ⚠️ CONFIANÇA BAIXA (${confidence} < ${threshold}). Solicitando confirmação.`);
      return {
        nextNodeId: undefined,
        response: '🔎 Só para confirmar: deseja saber sobre valores (1), convênios (2), localização (3), procedimentos (4) ou agendar (5)?',
        shouldStop: true
      };
    }
    
    // Find connection by port
    const nodeConnections = connections.get(node.id) || [];
    const targetConnection = nodeConnections.find(c => c.port === port);
    const nextNodeId = targetConnection?.targetId;
    
    context.workflowLogs.push(`🤖 [GPT] ✅ CLASSIFICAÇÃO ACEITA!`);
    context.workflowLogs.push(`🤖 [GPT]    Conexão: porta ${port} → node "${nextNodeId || 'NENHUM'}"`);
    context.workflowLogs.push(`🤖 [GPT] ==========================================`);
    
    // Update context based on intent
    if (port === '1') {
      context.userData.lastTopic = 'price';
      // Save user message to help API_CALL detect specific procedure
      context.userData.lastPriceQuery = userMessage;
    }
    else if (port === '2') context.userData.lastTopic = 'insurance';
    else if (port === '3') context.userData.lastTopic = 'location';
    else if (port === '4') context.userData.lastTopic = 'procedure_info';
    else if (port === '5') {
      context.userData.lastTopic = 'scheduling';
      context.userData.isSchedulingIntent = true;
    }
    else if (port === '6') context.userData.lastTopic = 'human';
    
    console.log(`🤖 [GPT] Intent classified - Port: ${port}, Next node: ${nextNodeId}`);
    
    return {
      nextNodeId,
      response: brief || '',
      shouldStop: false,
      autoAdvance: true
    };
    
  } catch (error: any) {
    console.error(`🤖 [GPT] Error calling GPT:`, error);
    context.workflowLogs.push(`🤖 [GPT] ❌ ERRO: ${error.message}`);
    
    return {
      nextNodeId: undefined,
      response: 'Desculpe, tive um problema ao processar sua mensagem. Pode repetir?',
      shouldStop: true
    };
  }
}

