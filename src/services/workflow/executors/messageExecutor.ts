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

  // DISABLED: Special case for msg_cadastro_sucesso - now handled by workflow nodes
  // The workflow now has explicit nodes for:
  // 1. action_get_procedimentos_insurance (ACTION) - fetches procedures
  // 2. msg_procedimentos_insurance (MESSAGE) - shows procedures
  // 3. transfer_to_queue (TRANSFER_HUMAN) - transfers to queue
  // This allows the workflow to be properly represented in the editor
  /*
  if (node.id === 'msg_cadastro_sucesso') {
    // ... código hardcoded removido - agora é feito pelos nós do workflow
  }
  */

  // DISABLED: Special case for msg_paciente_encontrado - now handled by workflow nodes
  // The workflow now has explicit nodes for procedures and queue transfer
  /*
  if (node.id === 'msg_paciente_encontrado') {
    // ... código hardcoded removido - agora é feito pelos nós do workflow
  }
  */

  // Special case: these messages should continue automatically to next node
  // msg_solicita_cadastro: continues to data collection
  // msg_cadastro_sucesso: continues to action_get_procedimentos_insurance
  // msg_paciente_encontrado: continues to action_get_procedimentos_insurance
  const shouldAutoAdvance = 
    node.id === 'msg_solicita_cadastro' ||
    node.id === 'msg_cadastro_sucesso' ||
    node.id === 'msg_paciente_encontrado';

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

