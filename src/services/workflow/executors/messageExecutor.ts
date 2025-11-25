import { WorkflowNode, WorkflowExecutionContext, ConnectionMap, NodeExecutionResult } from '../core/types';
import { interpolateMessage } from '../interpolators';

/**
 * Executes a MESSAGE node
 * MESSAGE nodes send a message and decide whether to stop or continue based on context
 */
export async function executeMessageNode(
  node: WorkflowNode,
  context: WorkflowExecutionContext,
  connections: ConnectionMap
): Promise<NodeExecutionResult> {
  // Get message from node content
  const rawMessage = node.content.message || node.content.text || '';

  // Interpolate placeholders
  const message = await interpolateMessage(rawMessage, context);

  // Add to conversation history if not empty
  if (message.trim()) {
    context.conversationHistory.push({
      role: 'bot',
      content: message
    });
  }

  // Get next node from connections
  const nodeConnections = connections.get(node.id) || [];
  const nextNodeId = nodeConnections[0]?.targetId;

  // Determine if this node should stop and wait for user response
  // Cases that should stop:
  // 1. Confirmation messages (contains "Confirmar?" or "Está tudo correto?")
  // 2. Questions that expect a structured response (ask_* nodes)
  // 3. Messages that show data and expect validation

  const isConfirmation = node.id.includes('confirma') ||
    message.includes('Está tudo correto?') ||
    message.includes('Confirmar?') ||
    message.includes('confirmar');

  const isQuestion = node.id.includes('ask_') && !node.id.includes('ask_procedimentos');

  // Check if message was already sent (avoid duplicate)
  const lastBotMessage = context.conversationHistory
    .filter(h => h.role === 'bot')
    .slice(-2, -1)[0]; // Second to last bot message

  const isDuplicate = lastBotMessage &&
    lastBotMessage.content === message &&
    message.trim().length > 0;

  if (isDuplicate) {
    console.log(`🔧 MESSAGE node ${node.id} - Duplicate message detected, skipping`);
    return {
      nextNodeId,
      response: '',
      shouldStop: true
    };
  }

  // Special case: unidade selection messages should STOP and wait for user response
  // The user needs to choose what they want (valores, convênios, agendar, etc.)
  // The GPT classifier will be called when the user sends their next message
  const isUnidadeMessage = node.id === 'unidade_vieiralves' ||
    node.id === 'unidade_sao_jose' ||
    node.id.includes('unidade_');

  if (isUnidadeMessage) {
    console.log(`🔧 MESSAGE node ${node.id} - Unidade message, stopping to wait for user choice`);
    return {
      nextNodeId, // Save nextNodeId (gpt_classifier) for when user responds
      response: message,
      shouldStop: true, // STOP and wait for user to choose what they want
      shouldSaveNextNode: true
    };
  }

  // Special case: msg_cadastro_sucesso - show procedures for insurance and transfer to queue
  if (node.id === 'msg_cadastro_sucesso') {
    // CRITICAL FIX: Always fetch patient from database to get the correct normalized insurance
    // Context values might be stale or incorrect
    let finalInsurance = 'Particular';

    if (context.userData.patientId) {
      try {
        // Import patient service to fetch from database
        const { getPatientById } = await import('../../patientDataService');
        const patient = await getPatientById(context.userData.patientId);

        if (patient) {
          finalInsurance = patient.insuranceCompany || 'Particular';
          console.log(`🔧 MESSAGE node ${node.id} - ✅ Fetched patient from DB: ${patient.name}, Insurance: "${finalInsurance}"`);
        } else {
          console.log(`🔧 MESSAGE node ${node.id} - ⚠️ Patient not found in  DB, falling back to context`);
          finalInsurance = context.userData.patientInsurance ||
            context.userData.collectedData?.insurance ||
            'Particular';
        }
      } catch (error) {
        console.error(`🔧 MESSAGE node ${node.id} - ❌ Error fetching patient from DB:`, error);
        // Fallback to context values
        finalInsurance = context.userData.patientInsurance ||
          context.userData.collectedData?.insurance ||
          'Particular';
      }
    } else {
      // No patientId, use context values  
      console.log(`🔧 MESSAGE node ${node.id} - ⚠️ No patientId, using context values`);
      finalInsurance = context.userData.patientInsurance ||
        context.userData.collectedData?.insurance ||
        'Particular';
    }

    console.log(`🔧 MESSAGE node ${node.id} - Final insurance to use: "${finalInsurance}"`);

    // Import insurance formatter
    const { formatProceduresForInsurance } = await import('../../insuranceNormalizer');

    // Build complete message
    let completeMessage = message;

    // Add procedures available for the insurance (pass the DB value directly - it's already normalized)
    console.log(`🔧 MESSAGE node ${node.id} - Calling formatProceduresForInsurance with: "${finalInsurance}"`);
    const proceduresMessage = formatProceduresForInsurance(finalInsurance);
    console.log(`🔧 MESSAGE node ${node.id} - Procedures message (first 200 chars): "${proceduresMessage.substring(0, 200)}"`);
    completeMessage += `\n\n${proceduresMessage}`;

    // Add queue message
    completeMessage += `\n\n⏳ **Você foi encaminhado para um de nossos atendentes!**\n\n`;
    completeMessage += `Enquanto aguarda, você pode informar quais procedimentos deseja agendar.\n`;
    completeMessage += `Nossa equipe entrará em contato em breve para finalizar seu agendamento.`;

    console.log(`🔧 MESSAGE node ${node.id} - Complete message generated with insurance: "${finalInsurance}"`);

    return {
      nextNodeId: undefined, // Stop here - patient is in queue
      response: completeMessage,
      shouldStop: true,
      shouldSaveNextNode: false
    };
  }

  // Special case: msg_paciente_encontrado  - show procedures for insurance
  if (node.id === 'msg_paciente_encontrado') {
    // CRITICAL FIX: Always fetch patient from database to get the correct normalized insurance
    let finalInsurance = 'Particular';

    if (context.userData.patientId) {
      try {
        const { getPatientById } = await import('../../patientDataService');
        const patient = await getPatientById(context.userData.patientId);

        if (patient) {
          finalInsurance = patient.insuranceCompany || 'Particular';
          console.log(`🔧 MESSAGE node ${node.id} - ✅ Fetched patient from DB: ${patient.name}, Insurance: "${finalInsurance}"`);
        } else {
          console.log(`🔧 MESSAGE node ${node.id} - ⚠️ Patient not found in DB, falling back to context`);
          finalInsurance = context.userData.patientInsurance ||
            context.userData.collectedData?.insurance ||
            'Particular';
        }
      } catch (error) {
        console.error(`🔧 MESSAGE node ${node.id} - ❌ Error fetching patient from DB:`, error);
        finalInsurance = context.userData.patientInsurance ||
          context.userData.collectedData?.insurance ||
          'Particular';
      }
    } else {
      console.log(`🔧 MESSAGE node ${node.id} - ⚠️ No patientId, using context values`);
      finalInsurance = context.userData.patientInsurance ||
        context.userData.collectedData?.insurance ||
        'Particular';
    }

    // Import insurance formatter
    const { formatProceduresForInsurance } = await import('../../insuranceNormalizer');

    // Build complete message
    let completeMessage = message;

    // Add procedures available for the insurance
    const proceduresMessage = formatProceduresForInsurance(finalInsurance);
    completeMessage += `\n\n${proceduresMessage}`;

    // Add queue message
    completeMessage += `\n\n⏳ **Você foi encaminhado para um de nossos atendentes!**\n\n`;
    completeMessage += `Enquanto aguarda, você pode informar quais procedimentos deseja agendar.\n`;
    completeMessage += `Nossa equipe entrará em contato em breve para finalizar seu agendamento.`;

    console.log(`🔧 MESSAGE node ${node.id} - Showing procedures for insurance: ${finalInsurance}`);

    return {
      nextNodeId: undefined, // Stop here - patient is in queue
      response: completeMessage,
      shouldStop: true,
      shouldSaveNextNode: false
    };
  }

  // Special case: msg_solicita_cadastro should continue automatically
  const shouldAutoAdvance = node.id === 'msg_solicita_cadastro';

  if (shouldAutoAdvance && nextNodeId) {
    console.log(`🔧 MESSAGE node ${node.id} - Auto-advancing to ${nextNodeId}`);
    return {
      nextNodeId,
      response: message,
      shouldStop: false,
      autoAdvance: true
    };
  }

  // If it's a confirmation or question, stop and wait for user response
  if (isConfirmation || isQuestion) {
    console.log(`🔧 MESSAGE node ${node.id} - Waiting for user response (confirmation/question)`);
    return {
      nextNodeId,
      response: message,
      shouldStop: true,
      shouldSaveNextNode: true
    };
  }

  // Default: send message and stop, waiting for next user message
  console.log(`🔧 MESSAGE node ${node.id} - Sent message, stopping`);

  return {
    nextNodeId,
    response: message,
    shouldStop: true,
    shouldSaveNextNode: true
  };
}

