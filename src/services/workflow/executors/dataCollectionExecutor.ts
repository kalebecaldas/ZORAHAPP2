import { WorkflowNode, WorkflowExecutionContext, ConnectionMap, NodeExecutionResult } from '../core/types';
import { validateField } from '../validators';
import { interpolateMessage } from '../interpolators';

/**
 * Format phone number for display
 */
function formatPhoneForDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    // Mobile: (92) 99999-9999
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    // Landline: (92) 3234-5678
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 13 && cleaned.startsWith('55')) {
    // With country code: +55 92 99999-9999
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  
  return phone; // Return as is if format is unknown
}

/**
 * Executes a DATA_COLLECTION node
 * DATA_COLLECTION nodes collect user data with validation
 */
export async function executeDataCollectionNode(
  node: WorkflowNode,
  context: WorkflowExecutionContext,
  connections: ConnectionMap
): Promise<NodeExecutionResult> {
  const field = node.content.field || '';
  const rawPrompt = node.content.prompt || node.content.message || 
                    `Por favor, informe seu ${field}:`;
  
  // Interpolate prompt
  const prompt = await interpolateMessage(rawPrompt, context);
  
  const userMessage = (context.message || '').trim();
  const currentCollectingField = context.userData.collectingField;
  const isCollectingThisField = currentCollectingField === field;
  
  console.log(`🔧 DATA_COLLECTION node ${node.id} - Field: "${field}"`);
  console.log(`🔧 DATA_COLLECTION - Currently collecting: "${currentCollectingField}"`);
  console.log(`🔧 DATA_COLLECTION - User message: "${userMessage}"`);
  console.log(`🔧 DATA_COLLECTION - Is collecting this field: ${isCollectingThisField}`);
  
  // If we're already collecting this field AND received a user response
  // BUT skip if we're in phone confirmation mode (handled separately above)
  if (isCollectingThisField && userMessage && !(field === 'phone' && context.userData.phoneConfirmationMode)) {
    console.log(`🔧 DATA_COLLECTION - Validating field "${field}" with value: "${userMessage}"`);
    
    const validation = await validateField(field, userMessage);
    
    if (!validation.valid) {
      const customErrorMessage = node.content.errorMessage;
      const errorMessage = customErrorMessage || 
                          validation.error || 
                          `⚠️ Dado inválido. ${prompt}`;
      
      console.log(`🔧 DATA_COLLECTION - Validation failed for "${field}": ${errorMessage}`);
      
      return {
        nextNodeId: undefined, // Stay on current node
        response: errorMessage,
        shouldStop: true
      };
    }
    
    // Valid data - save it
    if (!context.userData.collectedData) {
      context.userData.collectedData = {};
    }
    context.userData.collectedData[field] = validation.normalizedValue || userMessage;
    
    // Clear collecting field
    delete context.userData.collectingField;
    
    console.log(`🔧 DATA_COLLECTION - Field "${field}" collected successfully: "${validation.normalizedValue || userMessage}"`);
    
    // Get next node
    const nodeConnections = connections.get(node.id) || [];
    const nextNodeId = nodeConnections[0]?.targetId;
    
    console.log(`🔧 DATA_COLLECTION - Advancing to next node: ${nextNodeId}`);
    
    return {
      nextNodeId,
      response: '', // No response, just advance
      shouldStop: false,
      autoAdvance: true
    };
  }
  
  // Special handling for phone field - ask if user wants to use WhatsApp number
  if (field === 'phone' && !isCollectingThisField && !userMessage) {
    const whatsappPhone = context.phone;
    
    if (whatsappPhone) {
      // Format phone for display
      const formattedPhone = formatPhoneForDisplay(whatsappPhone);
      
      const phonePrompt = `📱 **Telefone de contato:**\n\n` +
                         `Identificamos o número: **${formattedPhone}**\n\n` +
                         `Você deseja usar este número ou informar outro?\n\n` +
                         `Digite:\n` +
                         `• **sim** ou **usar este** para usar o número do WhatsApp\n` +
                         `• **outro** ou **informar outro** para cadastrar um número diferente`;
      
      console.log(`🔧 DATA_COLLECTION - Asking if user wants to use WhatsApp number: ${whatsappPhone}`);
      
      // Mark that we're collecting phone (but in confirmation mode)
      context.userData.collectingField = field;
      context.userData.phoneConfirmationMode = true;
      
      return {
        nextNodeId: undefined,
        response: phonePrompt,
        shouldStop: true
      };
    }
  }
  
  // Handle phone confirmation response
  if (field === 'phone' && isCollectingThisField && userMessage && context.userData.phoneConfirmationMode) {
    const normalized = userMessage.toLowerCase().trim();
    const wantsToUseWhatsApp = normalized === 'sim' || 
                               normalized === 'usar este' || 
                               normalized === 'usar' ||
                               normalized === 'este' ||
                               normalized === 'ok' ||
                               normalized === 'confirmar';
    
    const wantsOtherNumber = normalized === 'outro' || 
                            normalized === 'informar outro' ||
                            normalized === 'outro número' ||
                            normalized === 'diferente' ||
                            normalized === 'cadastrar outro';
    
    if (wantsToUseWhatsApp) {
      // Use WhatsApp number
      const whatsappPhone = context.phone;
      const cleanedPhone = whatsappPhone.replace(/\D/g, '');
      
      if (!context.userData.collectedData) {
        context.userData.collectedData = {};
      }
      context.userData.collectedData[field] = cleanedPhone;
      
      // Clear collecting state
      delete context.userData.collectingField;
      delete context.userData.phoneConfirmationMode;
      
      console.log(`🔧 DATA_COLLECTION - User chose to use WhatsApp number: ${cleanedPhone}`);
      
      // Get next node
      const nodeConnections = connections.get(node.id) || [];
      const nextNodeId = nodeConnections[0]?.targetId;
      
      return {
        nextNodeId,
        response: `✅ Número ${formatPhoneForDisplay(cleanedPhone)} salvo!`,
        shouldStop: false,
        autoAdvance: true
      };
    } else if (wantsOtherNumber) {
      // Ask for different number
      delete context.userData.phoneConfirmationMode;
      context.userData.collectingField = field; // Keep collecting, but now for new number
      
      console.log(`🔧 DATA_COLLECTION - User wants to inform different number`);
      
      const newPhonePrompt = `📱 Por favor, informe o número de telefone que deseja cadastrar:\n\n` +
                            `(Formato: DDD + número, ex: 92999999999 ou (92) 99999-9999)`;
      
      return {
        nextNodeId: undefined,
        response: newPhonePrompt,
        shouldStop: true
      };
    } else {
      // Invalid response, ask again
      const phonePrompt = `📱 **Telefone de contato:**\n\n` +
                         `Identificamos o número: **${formatPhoneForDisplay(context.phone)}**\n\n` +
                         `Você deseja usar este número ou informar outro?\n\n` +
                         `Digite:\n` +
                         `• **sim** para usar o número do WhatsApp\n` +
                         `• **outro** para cadastrar um número diferente`;
      
      return {
        nextNodeId: undefined,
        response: phonePrompt,
        shouldStop: true
      };
    }
  }
  
  // First time encountering this node OR not yet collecting this field
  // Check if we should skip asking (avoid duplicate prompts)
  const lastBotMessage = context.conversationHistory
    .filter(h => h.role === 'bot')
    .slice(-1)[0];
  
  const promptNormalized = prompt.toLowerCase().trim();
  const lastMessageNormalized = (lastBotMessage?.content || '').toLowerCase().trim();
  
  const alreadyAsked = promptNormalized && 
                      lastMessageNormalized.includes(promptNormalized.substring(0, Math.min(30, promptNormalized.length)));
  
  if (alreadyAsked) {
    console.log(`🔧 DATA_COLLECTION - Prompt already asked, waiting for response`);
    
    // Mark that we're collecting this field
    context.userData.collectingField = field;
    
    return {
      nextNodeId: undefined,
      response: '', // Don't repeat the prompt
      shouldStop: true
    };
  }
  
  // Set collecting field and send prompt
  context.userData.collectingField = field;
  
  console.log(`🔧 DATA_COLLECTION - Sending prompt for field "${field}": "${prompt}"`);
  
  return {
    nextNodeId: undefined,
    response: prompt,
    shouldStop: true // Wait for user response
  };
}

