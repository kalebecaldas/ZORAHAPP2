import OpenAI from 'openai';
import { WorkflowNode, WorkflowExecutionContext, ConnectionMap, NodeExecutionResult } from '../core/types';
import { 
  formatClinicDataForGPT, 
  getProcedureInfoForGPT, 
  getInsuranceInfoForGPT, 
  getLocationInfoForGPT 
} from '../utils/clinicDataFormatter';

/**
 * Executes a GPT_RESPONSE node that generates complete, contextualized responses
 * Uses clinicData.ts directly to provide rich context to GPT
 */
export async function executeGPTResponseNode(
  node: WorkflowNode,
  context: WorkflowExecutionContext,
  connections: ConnectionMap
): Promise<NodeExecutionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  console.log(`🤖 [GPT Response] Starting GPT response generation: ${node.id}`);
  
  if (!apiKey) {
    console.error('🤖 [GPT Response] OPENAI_API_KEY not configured');
    context.workflowLogs.push('❌ OPENAI_API_KEY não configurada');
    return { 
      nextNodeId: undefined, 
      response: 'Desculpe, serviço temporariamente indisponível.', 
      shouldStop: true 
    };
  }
  
  const userMessage = (context.message || '').trim();
  const clinicCode = context.userData.selectedClinic || context.userData.clinicCode || 'vieiralves';
  
  // Check for generic/empty messages
  const genericMessages = ['oi', 'olá', 'ola', 'hey', 'hi', 'hello', 'ok', 'okay', 'beleza'];
  const isGenericMessage = genericMessages.some(g => 
    userMessage.toLowerCase() === g || 
    userMessage.toLowerCase().length <= 10 && userMessage.toLowerCase().includes(g)
  );
  
  if (!userMessage || isGenericMessage) {
    console.log(`🤖 [GPT Response] Skipping GPT for generic/empty message: "${userMessage}"`);
    return { 
      nextNodeId: undefined, 
      response: '', 
      shouldStop: true 
    };
  }
  
  try {
    const client = new OpenAI({ apiKey });
    
    // Get clinic data context
    const clinicContext = formatClinicDataForGPT(clinicCode);
    
    // Build conversation history
    const historyContext = context.conversationHistory
      .slice(-4)
      .map(h => `${h.role === 'user' ? 'Usuário' : 'Bot'}: ${h.content}`)
      .join('\n');
    
    // Detect what the user is asking about
    const normalizedMessage = userMessage.toLowerCase();
    
    // Check if asking about specific procedure
    const procedureKeywords = ['acupuntura', 'fisioterapia', 'rpg', 'pilates', 'quiropraxia', 
                                'liberação', 'miofascial', 'ventosa', 'ortopédica', 'ortopedica',
                                'neurológica', 'neurologica', 'pélvica', 'pelvica', 'respiratória', 'respiratoria'];
    const mentionedProcedure = procedureKeywords.find(kw => normalizedMessage.includes(kw));
    
    // Check if asking about insurance
    const insuranceKeywords = ['convênio', 'convenio', 'plano', 'bradesco', 'sulamerica', 
                               'unimed', 'amil', 'aceita', 'atende'];
    const mentionedInsurance = insuranceKeywords.find(kw => normalizedMessage.includes(kw));
    
    // Check if asking about location
    const locationKeywords = ['localização', 'localizacao', 'endereço', 'endereco', 'onde fica', 
                              'como chegar', 'horário', 'horario', 'funcionamento'];
    const mentionedLocation = locationKeywords.find(kw => normalizedMessage.includes(kw));
    
    // Check if asking about prices
    const priceKeywords = ['valor', 'preço', 'preco', 'quanto custa', 'quanto é', 'quanto custa'];
    const mentionedPrice = priceKeywords.find(kw => normalizedMessage.includes(kw));
    
    // Build specialized context based on what user is asking
    let specializedContext = '';
    
    if (mentionedProcedure && (mentionedPrice || normalizedMessage.includes('qual') || normalizedMessage.includes('quanto'))) {
      // User asking about specific procedure price/info
      const procedureInfo = getProcedureInfoForGPT(mentionedProcedure, clinicCode);
      if (procedureInfo) {
        specializedContext = `\n\n📋 INFORMAÇÃO ESPECÍFICA DO PROCEDIMENTO:\n${procedureInfo}`;
      }
    } else if (mentionedInsurance) {
      // User asking about insurance
      const insuranceInfo = getInsuranceInfoForGPT(mentionedInsurance);
      specializedContext = `\n\n🏥 INFORMAÇÃO SOBRE CONVÊNIO:\n${insuranceInfo}`;
    } else if (mentionedLocation) {
      // User asking about location
      const locationInfo = getLocationInfoForGPT(clinicCode);
      specializedContext = `\n\n📍 INFORMAÇÃO DE LOCALIZAÇÃO:\n${locationInfo}`;
    }
    
    // Build system prompt
    const systemPrompt = `Você é um assistente virtual especializado da ${clinicData.name}. 
Seu papel é fornecer informações completas, precisas e úteis sobre a clínica.

${clinicContext}

${specializedContext}

**INSTRUÇÕES IMPORTANTES:**
1. Use APENAS as informações fornecidas acima - não invente dados
2. Seja completo mas objetivo - forneça todas as informações relevantes
3. Use linguagem clara, amigável e profissional
4. Se o usuário perguntar sobre valores, sempre mencione:
   - Valor particular
   - Se requer avaliação prévia e seu custo
   - Pacotes disponíveis (se houver)
   - Que valores com convênio podem variar
5. Se perguntar sobre procedimentos, explique:
   - O que é o procedimento
   - Para que serve
   - Duração
   - Se requer avaliação
6. Sempre ofereça agendamento ao final da resposta quando apropriado
7. Se não souber algo, seja honesto e sugira entrar em contato

**FORMATO DA RESPOSTA:**
- Seja natural e conversacional
- Use emojis quando apropriado (💰, 🏥, 📍, ⏰, etc)
- Organize informações de forma clara
- Antecipe perguntas comuns do usuário

Responda de forma completa e útil, usando TODAS as informações relevantes do contexto acima.`;
    
    // Build user prompt
    const userPrompt = `Histórico da conversa:\n${historyContext || '(sem histórico anterior)'}\n\n` +
                      `Mensagem atual do usuário: "${userMessage}"\n\n` +
                      `Responda de forma completa, usando todas as informações relevantes do contexto da clínica.`;
    
    context.workflowLogs.push(`🤖 [GPT Response] 📨 Mensagem: "${userMessage}"`);
    context.workflowLogs.push(`🤖 [GPT Response] 🏥 Clínica: ${clinicCode}`);
    context.workflowLogs.push(`🤖 [GPT Response] ⏳ Gerando resposta completa...`);
    
    // Use more powerful model for complex responses (gpt-4o or gpt-4-turbo)
    const responseModel = process.env.OPENAI_RESPONSE_MODEL || 'gpt-4o';
    
    console.log(`🤖 [GPT Response] Using model: ${responseModel} for contextual response`);
    context.workflowLogs.push(`🤖 [GPT Response] 📊 Modelo usado: ${responseModel}`);
    
    const completion = await client.chat.completions.create({
      model: responseModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7, // Slightly higher for more natural responses
      max_tokens: 600 // More tokens for complete rich responses
    }, { timeout: 30000 });
    
    const response = completion.choices?.[0]?.message?.content || '';
    
    context.workflowLogs.push(`🤖 [GPT Response] ✅ Resposta gerada (${response.length} caracteres)`);
    
    // Get next node
    const nodeConnections = connections.get(node.id) || [];
    const nextNodeId = nodeConnections[0]?.targetId;
    
    // Add response to history
    if (response.trim()) {
      context.conversationHistory.push({
        role: 'bot',
        content: response
      });
    }
    
    return {
      nextNodeId,
      response: response.trim(),
      shouldStop: true, // Stop to show response
      shouldSaveNextNode: true
    };
    
  } catch (error: any) {
    console.error(`🤖 [GPT Response] Error:`, error);
    context.workflowLogs.push(`🤖 [GPT Response] ❌ ERRO: ${error.message}`);
    
    return {
      nextNodeId: undefined,
      response: 'Desculpe, tive um problema ao processar sua mensagem. Pode repetir?',
      shouldStop: true
    };
  }
}

// Import clinicData for reference in system prompt
import { clinicData } from '../../../data/clinicData.js';

