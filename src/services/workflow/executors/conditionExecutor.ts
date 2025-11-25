import { WorkflowNode, WorkflowExecutionContext, ConnectionMap, NodeExecutionResult, WorkflowConnection } from '../core/types';

/**
 * Executes a CONDITION node
 * CONDITION nodes evaluate a condition and route to different nodes based on the result
 */
export function executeConditionNode(
  node: WorkflowNode,
  context: WorkflowExecutionContext,
  connections: ConnectionMap
): NodeExecutionResult {
  const condition = node.content.condition || '';
  const userMessage = (context.message || '').toLowerCase().trim();
  
  console.log(`🔧 CONDITION node ${node.id} - Evaluating condition: "${condition}"`);
  console.log(`🔧 CONDITION node ${node.id} - User message: "${userMessage}"`);
  
  // Handle special conditions
  if (condition === 'clinic_selection' || node.id === 'clinic_selection') {
    return handleClinicSelection(userMessage, context, connections.get(node.id) || [], node);
  }
  
  if (condition === 'patient_found' || node.id === 'patient_decision' || node.id === 'patient_found_decision') {
    return handlePatientFound(context, connections.get(node.id) || [], node);
  }
  
  // Handle service selection condition
  if (condition === 'service_selection' || node.id === 'service_selection') {
    return handleServiceSelection(userMessage, context, connections.get(node.id) || [], node);
  }
  
  // Handle generic pattern matching (sim/não, yes/no, etc.)
  const matched = evaluateConditionPattern(condition, userMessage);
  const port = matched ? 'true' : 'false';
  
  console.log(`🔧 CONDITION node ${node.id} - Pattern matched: ${matched}, port: ${port}`);
  
  const nodeConnections = connections.get(node.id) || [];
  const targetConnection = nodeConnections.find(c => c.port === port);
  const nextNodeId = targetConnection?.targetId;
  
  const response = matched ? 
    (node.content.trueMessage || '') : 
    (node.content.falseMessage || 'Por favor, responda sim ou não.');
  
  console.log(`🔧 CONDITION node ${node.id} - Next node: ${nextNodeId}, response: "${response}"`);
  
  return {
    nextNodeId,
    response,
    shouldStop: !matched, // If no match, stop and wait for correct response
    autoAdvance: matched  // If matched, continue automatically
  };
}

/**
 * Handles clinic selection logic
 */
function handleClinicSelection(
  userMessage: string,
  context: WorkflowExecutionContext,
  nodeConnections: WorkflowConnection[],
  node: WorkflowNode
): NodeExecutionResult {
  const normalized = userMessage.replace(/\s+/g, ' ').trim();
  
  let selectedClinic: string | null = null;
  
  // Check numeric options (1, 2)
  if (normalized === '1' || normalized === 'um') {
    selectedClinic = 'vieiralves';
  } else if (normalized === '2' || normalized === 'dois') {
    selectedClinic = 'sao-jose';
  }
  
  // Check clinic names
  if (!selectedClinic) {
    if (normalized.includes('vieiralves') || normalized.includes('vieira')) {
      selectedClinic = 'vieiralves';
    } else if (normalized.includes('sao jose') || normalized.includes('são josé') || 
               normalized.includes('sao josé') || normalized.includes('são jose') ||
               normalized.includes('salvador')) {
      selectedClinic = 'sao-jose';
    }
  }
  
  if (selectedClinic) {
    // Save selected clinic to context
    context.userData.selectedClinic = selectedClinic;
    context.userData.clinicCode = selectedClinic;
    
    console.log(`🔧 CONDITION clinic_selection - Selected: ${selectedClinic}`);
    
    // Find connection for true port
    const targetConnection = nodeConnections.find(c => c.port === 'true' || c.port === selectedClinic);
    let nextNodeId = targetConnection?.targetId;
    
    // If no specific connection, use first connection or look for unidade node
    if (!nextNodeId) {
      if (selectedClinic === 'vieiralves') {
        nextNodeId = 'unidade_vieiralves';
      } else if (selectedClinic === 'sao-jose') {
        nextNodeId = 'unidade_sao_jose';
      }
      
      // Fallback to first connection
      if (!nextNodeId && nodeConnections.length > 0) {
        nextNodeId = nodeConnections[0].targetId;
      }
    }
    
    return {
      nextNodeId,
      response: node.content.trueMessage || '',
      shouldStop: false,
      autoAdvance: true
    };
  }
  
  // No valid selection
  console.log(`🔧 CONDITION clinic_selection - Invalid selection`);
  
  return {
    nextNodeId: undefined,
    response: node.content.falseMessage || 'Por favor, escolha uma de nossas unidades (1 ou 2).',
    shouldStop: true
  };
}

/**
 * Handles patient found condition
 */
function handlePatientFound(
  context: WorkflowExecutionContext,
  nodeConnections: WorkflowConnection[],
  node: WorkflowNode
): NodeExecutionResult {
  const patientFound = context.userData.patientFound || false;
  const port = patientFound ? 'true' : 'false';
  
  console.log(`🔧 CONDITION patient_found - Patient found: ${patientFound}, port: ${port}`);
  
  const targetConnection = nodeConnections.find(c => c.port === port);
  const nextNodeId = targetConnection?.targetId;
  
  return {
    nextNodeId,
    response: '', // No response, just routing
    shouldStop: false,
    autoAdvance: true
  };
}

/**
 * Handles service selection (1-6 options)
 */
function handleServiceSelection(
  userMessage: string,
  context: WorkflowExecutionContext,
  nodeConnections: WorkflowConnection[],
  node: WorkflowNode
): NodeExecutionResult {
  const normalized = userMessage.trim();
  
  // Check if user selected a number from 1-6
  const serviceMap: Record<string, string> = {
    '1': '1',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    'um': '1',
    'dois': '2',
    'três': '3',
    'tres': '3',
    'quatro': '4',
    'cinco': '5',
    'seis': '6'
  };
  
  const selectedPort = serviceMap[normalized];
  
  if (selectedPort) {
    console.log(`🔧 CONDITION service_selection - Selected service: ${selectedPort}`);
    
    const targetConnection = nodeConnections.find(c => c.port === selectedPort);
    const nextNodeId = targetConnection?.targetId;
    
    return {
      nextNodeId,
      response: '',
      shouldStop: false,
      autoAdvance: true
    };
  }
  
  // No valid selection
  console.log(`🔧 CONDITION service_selection - Invalid selection: ${userMessage}`);
  
  return {
    nextNodeId: undefined,
    response: 'Por favor, escolha uma opção de 1 a 6.',
    shouldStop: true
  };
}

/**
 * Evaluates a condition pattern (regex or keywords)
 */
function evaluateConditionPattern(pattern: string, message: string): boolean {
  if (!pattern || !message) return false;
  
  // Split pattern by | for multiple options
  const options = pattern.split('|').map(opt => opt.trim().toLowerCase());
  
  // Check if any option matches
  return options.some(option => {
    // Exact match
    if (message === option) return true;
    
    // Contains match (for longer phrases)
    if (message.includes(option)) return true;
    
    // Word boundary match
    const wordRegex = new RegExp(`\\b${option}\\b`, 'i');
    if (wordRegex.test(message)) return true;
    
    return false;
  });
}

