import { WorkflowNode, WorkflowExecutionContext, ConnectionMap, NodeExecutionResult } from '../core/types';
import { interpolateMessage } from '../interpolators';

/**
 * Executes a START node
 * START nodes send a welcome message and automatically advance to the next node
 */
export async function executeStartNode(
  node: WorkflowNode,
  context: WorkflowExecutionContext,
  connections: ConnectionMap
): Promise<NodeExecutionResult> {
  // Get welcome message from node content
  const rawMessage = node.content.message || node.content.text || node.content.welcomeMessage || 'Bem-vindo!';
  
  // Interpolate placeholders
  const message = await interpolateMessage(rawMessage, context);
  
  // Add to conversation history
  context.conversationHistory.push({
    role: 'bot',
    content: message
  });
  
  // Get next node from connections
  const nodeConnections = connections.get(node.id) || [];
  const nextNodeId = nodeConnections[0]?.targetId;
  
  console.log(`🔧 START node executed. Next node: ${nextNodeId}`);
  
  return {
    nextNodeId,
    response: message,
    shouldStop: false, // Don't stop, continue to next node
    autoAdvance: true  // Automatically advance to next node
  };
}

