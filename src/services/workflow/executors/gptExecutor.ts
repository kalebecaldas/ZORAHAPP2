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
      `Você é um assistente virtual amigável e prestativo de uma clínica de fisioterapia. 

SEU OBJETIVO:
1. RESPONDER de forma CONVERSACIONAL, ÚTIL e AMIGÁVEL
2. CLASSIFICAR a intenção do usuário para roteamento interno

CONTEXTO DA CLÍNICA:
${clinicContext}

CATEGORIAS DE INTENÇÃO (para roteamento):
1) VALORES - perguntas sobre preços, valores particulares, pacotes
2) CONVÊNIOS - perguntas sobre convênios aceitos, planos de saúde, cobertura
3) LOCALIZAÇÃO - perguntas sobre endereço, como chegar, horários, contato
4) PROCEDIMENTO - perguntas sobre o que é um procedimento, benefícios, duração, indicações
5) AGENDAR - desejo de marcar consulta, agendar, marcar horário, menções a encaminhamento médico
6) ATENDENTE - pedido para falar com humano, atendente, pessoa

REGRAS IMPORTANTES PARA O CAMPO "brief":
❌ NUNCA responda apenas: "Encaminhamento para fisioterapia", "Referência a procedimento", "Pergunta sobre valores"
✅ SEMPRE faça uma pergunta ou dê uma resposta ÚTIL e CONVERSACIONAL
✅ Use emojis para deixar mais amigável
✅ Faça perguntas esclarecedoras quando necessário
✅ Reconheça o que o usuário disse ANTES de perguntar mais

CASOS ESPECIAIS:
- "encaminhamento" ou "sessões" → USE OS PROCEDIMENTOS DA CLÍNICA para dar opções reais, pergunte qual, porta 5
- "sim", "isso", "correto" → Reconheça positivamente, pergunte como pode ajudar, porta 5
- "posso parcelar?" → Mencione que vai ajudar com pagamento, porta 1
- Mensagens vagas → Seja prestativo, USE OS DADOS DA CLÍNICA para oferecer opções reais

IMPORTANTE: Quando o usuário mencionar "encaminhamento" ou "sessões", SEMPRE inclua a lista real de procedimentos disponíveis no brief.

FORMATO DE RESPOSTA (JSON):
{"intent_port":"<1-6>","brief":"<RESPOSTA CONVERSACIONAL COMPLETA usando dados reais da clínica (mínimo 80 caracteres)>","confidence":<0-1>}

EXEMPLOS CORRETOS:
❌ MAU: {"intent_port":"5","brief":"Encaminhamento para fisioterapia","confidence":0.9}
✅ BOM: {"intent_port":"5","brief":"Ótimo! Você tem encaminhamento para fisioterapia! 🏥\\n\\nTemos estes procedimentos disponíveis:\\n- Fisioterapia Ortopédica (R$ 90,00)\\n- Fisioterapia Neurológica (R$ 100,00)\\n- RPG (R$ 120,00)\\n- Acupuntura (R$ 180,00)\\n\\nPara qual procedimento específico você foi encaminhado?","confidence":0.9}

❌ MAU: {"intent_port":"5","brief":"Referência a procedimento anterior","confidence":0.7}
✅ BOM: {"intent_port":"5","brief":"Perfeito! Entendi que você quer agendar. 📅\\n\\nTemos diversos procedimentos: Fisioterapia Ortopédica, Neurológica, RPG, Acupuntura, Fisioterapia Pélvica.\\n\\nQual desses você precisa?","confidence":0.8}

❌ MAU: {"intent_port":"1","brief":"Pergunta sobre parcelamento","confidence":0.8}
✅ BOM: {"intent_port":"1","brief":"Sobre formas de pagamento e parcelamento, posso te ajudar! 💳\\n\\nTemos procedimentos desde R$ 90,00 até R$ 220,00, com pacotes disponíveis.\\n\\nQual procedimento você gostaria de fazer?","confidence":0.9}`;
    
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
    
    // Use faster/cheaper model for classification (gpt-4o-mini by default)
    const classificationModel = process.env.OPENAI_CLASSIFICATION_MODEL || 'gpt-4o-mini';
    
    console.log(`🤖 [GPT] Using model: ${classificationModel} for intent classification`);
    
    const completion = await client.chat.completions.create({
      model: classificationModel,
      messages: [
        { role: 'system', content: 'Responda apenas com JSON válido sem texto extra.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, // Slightly higher for more natural brief
      max_tokens: 150 // More tokens for better brief responses
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
    
    // Ensure response is conversational (not just a classification)
    let conversationalResponse = brief || '';
    
    // If brief is too short or looks like a classification, make it more conversational WITH REAL DATA
    if (conversationalResponse.length < 50 || 
        conversationalResponse.match(/^(encaminhamento|refer[eê]ncia|pergunta|sobre)/i)) {
      
      console.log(`🤖 [GPT] ⚠️ Brief muito curto ou não conversacional: "${conversationalResponse}"`);
      
      // Get procedures list for better responses
      const clinicCode = context.userData.selectedClinic || 'vieiralves';
      const clinicInfo = clinicDataService.getClinicInfo(clinicCode);
      const mainProcedures = (clinicInfo.procedures || []).slice(0, 5).map((p: any) => {
        const price = p.prices?.[clinicCode];
        const priceText = typeof price === 'number' ? `R$ ${price},00` : 'consultar';
        return `- ${p.name} (${priceText})`;
      }).join('\n');
      
      // Generate better response based on intent WITH REAL DATA
      const conversationalMap: Record<string, string> = {
        '1': `Entendi que você quer saber sobre valores! 💰\n\nNossos principais procedimentos:\n${mainProcedures}\n\nQual procedimento te interessa?`,
        '2': `Legal! Você quer saber sobre convênios. 🏥\n\nAceitamos: ${(clinicInfo.acceptedInsurance || []).slice(0, 5).join(', ')} e outros.\n\nQual convênio você tem?`,
        '3': `Vou te passar nossa localização! 📍\n\n${clinicLocations[clinicCode].name}\n${clinicLocations[clinicCode].address}\n${clinicLocations[clinicCode].phone}\n\nPrecisa saber como chegar?`,
        '4': `Você quer saber sobre procedimentos! 📝\n\nOferecemos:\n${mainProcedures}\n\nQual procedimento te interessa?`,
        '5': `Ótimo! Vamos agendar sua consulta! 📅\n\nTemos disponíveis:\n${mainProcedures}\n\nPara qual procedimento você precisa agendar?`,
        '6': `Entendi! Vou te conectar com um atendente humano. ⏳ Aguarde um momento...`
      };
      
      conversationalResponse = conversationalMap[port] || conversationalResponse;
      context.workflowLogs.push(`🤖 [GPT] ✨ Resposta melhorada com dados reais: "${conversationalResponse.substring(0, 100)}..."`);
    }
    
    return {
      nextNodeId,
      response: conversationalResponse,
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

