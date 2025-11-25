// Core types and interfaces for the workflow system

export interface WorkflowNode {
  id: string;
  type: 'START' | 'MESSAGE' | 'CONDITION' | 'DATA_COLLECTION' | 'GPT_RESPONSE' | 'ACTION' | 'API_CALL' | 'COLLECT_INFO' | 'TRANSFER_HUMAN' | 'END';
  content: {
    message?: string;
    prompt?: string;
    text?: string;
    field?: string;
    condition?: string;
    trueMessage?: string;
    falseMessage?: string;
    systemPrompt?: string;
    action?: string;
    endpoint?: string;
    errorMessage?: string;
    welcomeMessage?: string;
    ports?: Array<{
      id: string;
      label: string;
    }>;
    [key: string]: any;
  };
  position: { x: number; y: number };
  data?: any; // Legacy support
}

export interface NodeExecutionResult {
  nextNodeId?: string;
  response: string;
  shouldStop?: boolean;
  autoAdvance?: boolean;
  shouldSaveNextNode?: boolean;
  context?: Partial<WorkflowExecutionContext>;
}

export interface WorkflowExecutionContext {
  workflowId: string;
  phone: string;
  message: string;
  currentNodeId: string;
  conversationHistory: Array<{ role: 'user' | 'bot'; content: string }>;
  userData: {
    selectedClinic?: string;
    clinicCode?: string;
    lastTopic?: string;
    isSchedulingIntent?: boolean;
    collectingField?: string;
    currentCollectField?: string;
    collectedData?: Record<string, any>;
    patientName?: string;
    patientId?: string;
    patientInsurance?: string;
    patientFound?: boolean;
    coveredProcedures?: string[];
    intentReady?: boolean;
    intentLogged?: boolean;
    intentSummary?: any;
    registrationComplete?: boolean;
    [key: string]: any;
  };
  workflowLogs: string[];
}

export interface WorkflowConnection {
  targetId: string;
  condition?: string;
  port?: string;
}

export type ConnectionMap = Map<string, WorkflowConnection[]>;

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedValue?: string;
}

export interface WorkflowConfig {
  nodes: WorkflowNode[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    data?: {
      port?: string;
      condition?: string;
    };
    port?: string;
    condition?: string;
  }>;
}

