import { 
  WorkflowNode, 
  WorkflowExecutionContext, 
  ConnectionMap, 
  NodeExecutionResult,
  WorkflowConfig 
} from './types';
import {
  executeStartNode,
  executeMessageNode,
  executeConditionNode,
  executeDataCollectionNode,
  executeGPTNode,
  executeActionNode,
  executeApiCallNode
} from '../executors';

/**
 * Main WorkflowEngine class
 * Orchestrates the execution of workflow nodes
 */
export class WorkflowEngine {
  private context: WorkflowExecutionContext;
  private nodes: Map<string, WorkflowNode>;
  private connections: ConnectionMap;
  
  constructor(
    nodes: WorkflowNode[],
    workflowId: string,
    phone: string,
    message: string,
    edges?: Array<any>,
    existingContext?: Partial<WorkflowExecutionContext>
  ) {
    // Normalize nodes to ensure content property
    const normalizedNodes = nodes.map(node => {
      const mergedContent = {
        ...(node.content || {}),
        ...(node.data || {}),
      };
      
      return {
        ...node,
        content: mergedContent,
        data: node.data ?? mergedContent
      };
    });
    
    this.nodes = new Map(normalizedNodes.map(node => [node.id, node]));
    this.connections = new Map();
    
    console.log(`🔧 WorkflowEngine constructor - nodes: ${nodes.length}, edges: ${edges?.length || 0}`);
    
    // Build connection map from edges
    if (edges && edges.length > 0) {
      edges.forEach(edge => {
        const sourceId = edge.source;
        const targetId = edge.target;
        const port = edge.data?.port || edge.port || 'main';
        const condition = edge.data?.condition || edge.condition;
        
        if (!this.connections.has(sourceId)) {
          this.connections.set(sourceId, []);
        }
        
        this.connections.get(sourceId)!.push({
          targetId,
          port,
          condition
        });
      });
    }
    
    // Initialize context
    this.context = {
      workflowId,
      phone,
      message,
      currentNodeId: existingContext?.currentNodeId || '',
      conversationHistory: existingContext?.conversationHistory || [],
      userData: existingContext?.userData || {},
      workflowLogs: []
    };
    
    // Add user message to history if provided
    if (message && message.trim()) {
      this.context.conversationHistory.push({
        role: 'user',
        content: message
      });
    }
    
    console.log(`🔧 WorkflowEngine initialized - Current node: ${this.context.currentNodeId}`);
  }
  
  /**
   * Executes the current node in the workflow
   */
  async executeNextNode(): Promise<NodeExecutionResult> {
    const currentNodeId = this.context.currentNodeId;
    
    if (!currentNodeId) {
      console.log(`🔧 WorkflowEngine - No current node ID`);
      return { 
        nextNodeId: undefined, 
        response: '', 
        shouldStop: true 
      };
    }
    
    const node = this.nodes.get(currentNodeId);
    
    if (!node) {
      console.error(`🔧 WorkflowEngine - Node not found: ${currentNodeId}`);
      return { 
        nextNodeId: undefined, 
        response: '', 
        shouldStop: true 
      };
    }
    
    console.log(`🔧 WorkflowEngine - Executing node: ${node.id} (${node.type})`);
    this.context.workflowLogs.push(`📍 Executando node: ${node.id} (${node.type})`);
    
    // Call appropriate executor based on node type
    let result: NodeExecutionResult;
    
    try {
      switch (node.type) {
        case 'START':
          result = await executeStartNode(node, this.context, this.connections);
          break;
        
        case 'MESSAGE':
          result = await executeMessageNode(node, this.context, this.connections);
          break;
        
        case 'CONDITION':
          result = executeConditionNode(node, this.context, this.connections);
          break;
        
        case 'DATA_COLLECTION':
          result = await executeDataCollectionNode(node, this.context, this.connections);
          break;
        
        case 'GPT_RESPONSE':
          result = await executeGPTNode(node, this.context, this.connections);
          break;
        
        case 'ACTION':
          result = await executeActionNode(node, this.context, this.connections);
          break;
        
        case 'API_CALL':
          result = await executeApiCallNode(node, this.context, this.connections);
          break;
        
        case 'END':
        case 'TRANSFER_HUMAN':
          result = {
            nextNodeId: undefined,
            response: node.content.message || 'Encerrando atendimento.',
            shouldStop: true
          };
          break;
        
        default:
          console.log(`🔧 WorkflowEngine - Unknown node type: ${node.type}`);
          result = { 
            nextNodeId: undefined, 
            response: '', 
            shouldStop: true 
          };
      }
      
      // Update current node ID if we have a next node
      if (result.nextNodeId) {
        this.context.currentNodeId = result.nextNodeId;
        console.log(`🔧 WorkflowEngine - Updated current node to: ${result.nextNodeId}`);
      }
      
      // Log result
      this.context.workflowLogs.push(
        `   ➡️ Next: ${result.nextNodeId || 'STOP'}, ` +
        `Response: ${result.response ? 'Yes' : 'No'}, ` +
        `Stop: ${result.shouldStop ? 'Yes' : 'No'}, ` +
        `AutoAdvance: ${result.autoAdvance ? 'Yes' : 'No'}`
      );
      
      // If autoAdvance is true, execute next node immediately
      if (result.autoAdvance && result.nextNodeId && !result.shouldStop) {
        console.log(`🔧 WorkflowEngine - Auto-advancing to: ${result.nextNodeId}`);
        
        const nextNode = this.nodes.get(result.nextNodeId);
        if (nextNode) {
          const nextResult = await this.executeNextNode();
          
          // Combine responses if both have responses
          if (result.response && nextResult.response) {
            nextResult.response = [result.response, nextResult.response]
              .filter(Boolean)
              .join('\n\n');
          } else if (result.response && !nextResult.response) {
            nextResult.response = result.response;
          }
          
          return nextResult;
        }
      }
      
      return result;
      
    } catch (error: any) {
      console.error(`🔧 WorkflowEngine - Error executing node ${node.id}:`, error);
      this.context.workflowLogs.push(`❌ Erro ao executar node ${node.id}: ${error.message}`);
      
      return {
        nextNodeId: undefined,
        response: 'Desculpe, ocorreu um erro. Pode tentar novamente?',
        shouldStop: true
      };
    }
  }
  
  /**
   * Gets the current execution context
   */
  getContext(): WorkflowExecutionContext {
    return this.context;
  }
  
  /**
   * Gets workflow logs
   */
  getWorkflowLogs(): string[] {
    return this.context.workflowLogs;
  }
  
  /**
   * Updates context with external data
   */
  updateContext(updates: Partial<WorkflowExecutionContext>): void {
    this.context = {
      ...this.context,
      ...updates,
      userData: {
        ...this.context.userData,
        ...(updates.userData || {})
      }
    };
  }
}

