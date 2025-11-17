import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Plus, 
  X, 
  Settings, 
  MessageSquare, 
  Bot, 
  Users, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Save,
  Trash2,
  Copy,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { api } from '../lib/utils';
import { toast } from 'sonner';

interface Position {
  x: number;
  y: number;
}

interface Port {
  id: string;
  label: string;
  type: 'input' | 'output';
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface Connection {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  condition?: string;
  label?: string;
}

interface WorkflowNode {
  id: string;
  type: 'START' | 'MESSAGE' | 'CONDITION' | 'ACTION' | 'GPT_RESPONSE' | 'DATA_COLLECTION' | 'TRANSFER_HUMAN' | 'DELAY' | 'END' | 'WEBHOOK' | 'API_CALL' | 'COLLECT_INFO';
  content: {
    text?: string;
    condition?: string;
    action?: string;
    options?: string[];
    systemPrompt?: string;
    field?: string;
    fields?: string[];
    prompt?: string;
    delay?: number;
    finalMessage?: string;
    url?: string;
    method?: string;
    headers?: any;
    body?: any;
    endpoint?: string;
    message?: string;
    ports?: Port[];
  };
  position: Position;
  connections?: string[];
}

interface WorkflowEditorProps {
  workflow: {
    id?: string;
    name: string;
    description: string;
    nodes: WorkflowNode[];
    isActive?: boolean;
  };
  onSave: (workflow: any) => void;
  onCancel: () => void;
  onAutoLayout?: (nodes: WorkflowNode[]) => WorkflowNode[] | void;
}

const nodeTypes = [
  { type: 'START', label: 'Início', icon: Play, color: 'bg-green-500', description: 'Ponto de entrada do fluxo' },
  { type: 'MESSAGE', label: 'Mensagem', icon: MessageSquare, color: 'bg-blue-500', description: 'Envia mensagem ao usuário' },
  { type: 'CONDITION', label: 'Condição', icon: AlertCircle, color: 'bg-yellow-500', description: 'Ramificações condicionais' },
  { type: 'ACTION', label: 'Ação', icon: Settings, color: 'bg-purple-500', description: 'Executa ação externa' },
  { type: 'API_CALL', label: 'API Call', icon: Settings, color: 'bg-purple-600', description: 'Consulta API interna' },
  { type: 'GPT_RESPONSE', label: 'IA Resposta', icon: Bot, color: 'bg-indigo-500', description: 'Gera resposta com IA' },
  { type: 'DATA_COLLECTION', label: 'Coleta Dados', icon: Copy, color: 'bg-teal-500', description: 'Coleta informações' },
  { type: 'COLLECT_INFO', label: 'Coletar Infos', icon: Copy, color: 'bg-teal-600', description: 'Coleta múltiplos campos' },
  { type: 'TRANSFER_HUMAN', label: 'Transferir', icon: Users, color: 'bg-red-500', description: 'Transfere para humano' },
  { type: 'DELAY', label: 'Delay', icon: Clock, color: 'bg-gray-500', description: 'Aguarda tempo' },
  { type: 'END', label: 'Fim', icon: CheckCircle, color: 'bg-green-600', description: 'Encerra o fluxo' },
  { type: 'WEBHOOK', label: 'Webhook', icon: MessageSquare, color: 'bg-pink-500', description: 'Chama webhook' }
];

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflow, onSave, onCancel, onAutoLayout }) => {
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow.nodes || []);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showNodePanel, setShowNodePanel] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string; portId: string; portType: 'input' | 'output' } | null>(null);
  const [tempConnection, setTempConnection] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [nodeSearch, setNodeSearch] = useState('');
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [showPortLabels, setShowPortLabels] = useState(false);
  const [routingMode, setRoutingMode] = useState<'bezier' | 'orthogonal'>('orthogonal');
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const initializedNodes = (workflow.nodes || []).map(node => ({
      ...node,
      content: {
        ...node.content,
        text: node.content.text || (node.type === 'MESSAGE' || node.type === 'START' ? (node as any).content?.message : node.content.text),
        ports: node.type === 'CONDITION' 
          ? (node.content.ports || getConditionPorts(node.content.condition))
          : (node.content.ports || getDefaultPorts(node.type))
      }
    }));
    setNodes(initializedNodes);
    const initialConnections: Connection[] = [];
    (workflow.nodes || []).forEach(n => {
      const conns: any[] = Array.isArray((n as any).connections) ? (n as any).connections : [];
      conns.forEach((c: any, idx: number) => {
        const targetId = typeof c === 'string' ? c : c?.targetId;
        const condition = typeof c === 'string' ? undefined : c?.condition;
        const sourcePort = typeof c === 'string' ? 'output' : (c?.port || 'output');
        if (targetId) {
          initialConnections.push({
            id: `conn-${n.id}-${targetId}-${idx}`,
            source: n.id,
            sourcePort,
            target: targetId,
            targetPort: 'input',
            condition
          });
        }
      });
    });
    setConnections(initialConnections);
  }, [workflow.nodes]);

  const getDefaultPorts = (type: WorkflowNode['type']): Port[] => {
    switch (type) {
      case 'START':
        return [{ id: 'output', label: 'Saída', type: 'output', position: 'bottom' }];
      case 'END':
        return [{ id: 'input', label: 'Entrada', type: 'input', position: 'top' }];
      case 'CONDITION':
        return [
          { id: 'input', label: 'Entrada', type: 'input', position: 'top' },
          { id: 'output', label: 'Saída', type: 'output', position: 'bottom' }
        ];
      default:
        return [
          { id: 'input', label: 'Entrada', type: 'input', position: 'top' },
          { id: 'output', label: 'Saída', type: 'output', position: 'bottom' }
        ];
    }
  };

  const getConditionPorts = (cond?: string): Port[] => {
    const base: Port[] = [{ id: 'input', label: 'Entrada', type: 'input', position: 'top' }];
    if ((cond || '').toLowerCase() === 'clinic_selection') {
      return [...base, { id: 'true', label: 'Verdadeiro', type: 'output', position: 'bottom' }, { id: 'false', label: 'Falso', type: 'output', position: 'bottom' }];
    }
    if ((cond || '').toLowerCase() === 'service_selection') {
      return [...base,
        { id: '1', label: '1', type: 'output', position: 'bottom' },
        { id: '2', label: '2', type: 'output', position: 'bottom' },
        { id: '3', label: '3', type: 'output', position: 'bottom' },
        { id: '4', label: '4', type: 'output', position: 'bottom' },
        { id: '5', label: '5', type: 'output', position: 'bottom' }
      ];
    }
    return [...base, { id: 'output', label: 'Saída', type: 'output', position: 'bottom' }];
  };

  const addNode = (type: WorkflowNode['type']) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      position: { 
        x: 200 + Math.random() * 200, 
        y: 200 + Math.random() * 200 
      }
    };
    setNodes([...nodes, newNode]);
    setShowNodePanel(false);
  };

  const getDefaultContent = (type: WorkflowNode['type']) => {
    switch (type) {
      case 'START':
        return { 
          text: 'Em qual unidade você gostaria de ser atendido(a)?',
          ports: getDefaultPorts('START')
        };
      case 'MESSAGE':
        return { 
          text: 'Digite sua mensagem aqui...',
          ports: getDefaultPorts('MESSAGE')
        };
      case 'CONDITION':
        return { 
          condition: 'clinic_selection',
          ports: getConditionPorts('clinic_selection')
        };
      case 'ACTION':
        return { 
          url: 'http://localhost:4001/api/appointments',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { procedure: 'Consulta' },
          ports: getDefaultPorts('ACTION')
        };
      case 'API_CALL':
        return {
          endpoint: 'get_clinic_procedures',
          message: 'Buscando informações...',
          ports: getDefaultPorts('API_CALL')
        };
      case 'GPT_RESPONSE':
        return { 
          systemPrompt: 'Você é um assistente de agendamento médico. Seja prestativo e profissional.',
          ports: getDefaultPorts('GPT_RESPONSE')
        };
      case 'DATA_COLLECTION':
        return { 
          field: 'phone',
          prompt: 'Qual é seu número de telefone?',
          ports: getDefaultPorts('DATA_COLLECTION')
        };
      case 'COLLECT_INFO':
        return {
          fields: ['procedure_type','preferred_date','preferred_time','insurance'],
          message: 'Vamos coletar algumas informações...',
          ports: getDefaultPorts('COLLECT_INFO')
        };
      case 'TRANSFER_HUMAN':
        return { 
          finalMessage: 'Transferindo para um atendente humano...',
          ports: getDefaultPorts('TRANSFER_HUMAN')
        };
      case 'DELAY':
        return { 
          delay: 5,
          ports: getDefaultPorts('DELAY')
        };
      case 'END':
        return { 
          finalMessage: 'Obrigado! Até logo!',
          ports: getDefaultPorts('END')
        };
      case 'WEBHOOK':
        return { 
          url: '/webhook/custom',
          method: 'POST',
          ports: getDefaultPorts('WEBHOOK')
        };
      default:
        return { ports: getDefaultPorts('MESSAGE') };
    }
  };

  const updateNodeContent = (nodeId: string, content: any) => {
    setNodes(nodes.map(node => {
      if (node.id !== nodeId) return node;
      const nextContent = { ...node.content, ...content };
      if (node.type === 'CONDITION' && Object.prototype.hasOwnProperty.call(content, 'condition')) {
        nextContent.ports = getConditionPorts((content as any).condition);
      }
      if ((node.type === 'MESSAGE' || node.type === 'START') && Object.prototype.hasOwnProperty.call(content, 'text')) {
        nextContent.message = (content as any).text;
      }
      return { ...node, content: nextContent };
    }));
  };

  const deleteNode = (nodeId: string) => {
    setNodes(nodes.filter(node => node.id !== nodeId));
    setConnections(connections.filter(conn => conn.source !== nodeId && conn.target !== nodeId));
    setSelectedNode(null);
  };

  const duplicateNode = (node: WorkflowNode) => {
    const newNode = {
      ...node,
      id: `node-${Date.now()}`,
      position: { x: node.position.x + 50, y: node.position.y + 50 }
    };
    setNodes([...nodes, newNode]);
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - canvasRect.left - pan.x) / zoom;
    const worldY = (e.clientY - canvasRect.top - pan.y) / zoom;

    setDraggedNode(nodeId);
    setDragOffset({
      x: worldX - node.position.x,
      y: worldY - node.position.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedNode && !isPanning && !connectionStart) return;

    if (draggedNode) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      
      const worldX = (e.clientX - canvasRect.left - pan.x) / zoom;
      const worldY = (e.clientY - canvasRect.top - pan.y) / zoom;
      const x = worldX - dragOffset.x;
      const y = worldY - dragOffset.y;
      const snap = snapEnabled ? gridSize : 1;
      const sx = Math.max(0, snapEnabled ? Math.round(x / snap) * snap : x);
      const sy = Math.max(0, snapEnabled ? Math.round(y / snap) * snap : y);
      setNodes(prevNodes => prevNodes.map(node => node.id === draggedNode ? { ...node, position: { x: sx, y: sy } } : node));
    } else if (isPanning) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      setPan({ x: newX, y: newY });
    } else if (connectionStart) {
      // Atualizar conexão temporária
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      
      const x = (e.clientX - canvasRect.left - pan.x) / zoom;
      const y = (e.clientY - canvasRect.top - pan.y) / zoom;
      setTempConnection({ x, y });
    }
  }, [draggedNode, dragOffset.x, dragOffset.y, isPanning, connectionStart, pan.x, pan.y, zoom, snapEnabled, gridSize]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
    setIsPanning(false);
    setTempConnection(null);
  }, []);

  useEffect(() => {
    if (draggedNode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedNode, handleMouseMove, handleMouseUp]);

  const startConnection = (nodeId: string, portId: string, portType: 'input' | 'output') => {
    console.log('startConnection called:', { nodeId, portId, portType, currentConnectionStart: connectionStart });
    
    if (connectionStart && connectionStart.nodeId === nodeId && connectionStart.portId === portId) {
      setConnectionStart(null);
      console.log('Connection cancelled - same port clicked');
    } else {
      setConnectionStart({ nodeId, portId, portType });
      console.log('Connection started:', { nodeId, portId, portType });
    }
  };

  const completeConnection = (targetNodeId: string, targetPortId: string, targetPortType: 'input' | 'output') => {
    console.log('completeConnection called:', { connectionStart, targetNodeId, targetPortId, targetPortType });
    
    if (connectionStart && connectionStart.nodeId !== targetNodeId) {
      // Verificar se é uma conexão válida (output -> input)
      if (connectionStart.portType === 'output' && targetPortType === 'input') {
        const condition = window.prompt('Condição (opcional):')?.trim() || undefined;
        const newConnection: Connection = {
          id: `conn-${Date.now()}`,
          source: connectionStart.nodeId,
          sourcePort: connectionStart.portId,
          target: targetNodeId,
          targetPort: targetPortId,
          condition
        };
        console.log('Creating new connection:', newConnection);
        setConnections(prev => [...prev, newConnection]);
        setConnectionStart(null);
      } else if (connectionStart.portType === 'input' && targetPortType === 'output') {
        // Conexão reversa - inverter a direção
        const condition = window.prompt('Condição (opcional):')?.trim() || undefined;
        const newConnection: Connection = {
          id: `conn-${Date.now()}`,
          source: targetNodeId,
          sourcePort: targetPortId,
          target: connectionStart.nodeId,
          targetPort: connectionStart.portId,
          condition
        };
        console.log('Creating reverse connection:', newConnection);
        setConnections(prev => [...prev, newConnection]);
        setConnectionStart(null);
      }
    } else {
      console.log('Connection not completed - same node or no connection start');
      setConnectionStart(null);
    }
  };

  const deleteConnection = (connectionId: string) => {
    setConnections(connections.filter(conn => conn.id !== connectionId));
  };

  const startPan = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-container')) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    setIsPanning(true);
    setDragOffset({ x: x - pan.x, y: y - pan.y });
    e.preventDefault();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(2, Math.max(0.5, prev + delta)));
  };

  const getNodeIcon = (type: WorkflowNode['type']) => {
    const nodeType = nodeTypes.find(nt => nt.type === type);
    return nodeType?.icon || MessageSquare;
  };

  const getNodeColor = (type: WorkflowNode['type']) => {
    const nodeType = nodeTypes.find(nt => nt.type === type);
    return nodeType?.color || 'bg-gray-500';
  };

  const autoLayout = () => {
    const start = nodes.find(n => n.type === 'START');
    const otherNodes = nodes.filter(n => n.type !== 'START');
    const ordered = start ? [start, ...otherNodes] : nodes;

    const defaultLayout = ordered.map((node, index) => ({
      ...node,
      position: { x: 100 + index * 300, y: 200 }
    }));

    if (typeof (onAutoLayout) === 'function') {
      const result = onAutoLayout(defaultLayout.map(n => ({ ...n })));
      if (Array.isArray(result)) {
        setNodes(result);
        toast.success('Layout aplicado (externo)');
        return;
      }
    }
    setNodes(defaultLayout);
    toast.success('Layout automático aplicado');
  };

  const saveWorkflow = () => {
    if (nodes.length === 0) {
      toast.error('Adicione pelo menos um nó ao workflow');
      return;
    }

    const startNode = nodes.find(n => n.type === 'START');
    const endNode = nodes.find(n => n.type === 'END');

    if (!startNode) {
      toast.error('Adicione um nó de início ao workflow');
      return;
    }

    if (!endNode) {
      toast.error('Adicione um nó de fim ao workflow');
      return;
    }

    onSave({
      ...workflow,
      nodes: nodes.map(node => ({
        ...node,
        connections: connections
          .filter(conn => conn.source === node.id)
          .map(conn => ({
            targetId: conn.target,
            condition: conn.condition,
            port: conn.sourcePort
          }))
      }))
    });
  };

  const renderConnections = () => {
    const NODE_WIDTH = 200;
    const NODE_HEIGHT = 100;
    const PORT_RADIUS = 4;

    const elements = connections.map(conn => {
      const sourceNode = nodes.find(n => n.id === conn.source);
      const targetNode = nodes.find(n => n.id === conn.target);
      if (!sourceNode || !targetNode) return null;

      const sourcePorts = (sourceNode.content.ports || []).filter(p => p.type === 'output');
      const targetPorts = (targetNode.content.ports || []).filter(p => p.type === 'input');
      const sourcePort = (sourceNode.content.ports || []).find(p => p.id === conn.sourcePort) || sourcePorts[0];
      const targetPort = (targetNode.content.ports || []).find(p => p.id === conn.targetPort) || targetPorts[0];

      const sIndex = Math.max(0, sourcePorts.findIndex(p => p.id === (sourcePort?.id || 'output')));
      const tIndex = Math.max(0, targetPorts.findIndex(p => p.id === (targetPort?.id || 'input')));

      const sLeftPct = (sIndex + 1) / (sourcePorts.length + 1);
      const tLeftPct = (tIndex + 1) / (targetPorts.length + 1);

      const sourceX = sourceNode.position.x + sLeftPct * NODE_WIDTH;
      const sourceY = sourceNode.position.y + (sourcePort?.position === 'bottom' ? NODE_HEIGHT : 0);
      const targetX = targetNode.position.x + tLeftPct * NODE_WIDTH;
      const targetY = targetNode.position.y + (targetPort?.position === 'top' ? 0 : NODE_HEIGHT);

      const midX = (sourceX + targetX) / 2;
      const midY = (sourceY + targetY) / 2;

      const dx = Math.max(40, Math.abs(targetX - sourceX) * 0.25);
      const pathD = routingMode === 'orthogonal'
        ? `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`
        : `M ${sourceX} ${sourceY} C ${sourceX + dx} ${sourceY} ${targetX - dx} ${targetY} ${targetX} ${targetY}`;

      return (
        <g key={conn.id}>
          <path
            d={pathD}
            stroke="#6B7280"
            strokeWidth="2"
            fill="none"
            className="hover:stroke-blue-500 cursor-pointer"
            vectorEffect="non-scaling-stroke"
            onClick={() => deleteConnection(conn.id)}
          />
          {conn.condition && (
            <text
              x={(sourceX + targetX) / 2}
              y={midY - 10}
              textAnchor="middle"
              className="text-xs fill-gray-700 pointer-events-none"
            >
              {conn.condition}
            </text>
          )}
        </g>
      );
    });

    // Adicionar conexão temporária
    if (connectionStart && tempConnection) {
      const sourceNode = nodes.find(n => n.id === connectionStart.nodeId);
      if (sourceNode) {
        const sourcePorts = (sourceNode.content.ports || []).filter(p => p.type === (connectionStart.portType === 'output' ? 'output' : 'input'));
        const sourcePort = sourcePorts.find(p => p.id === connectionStart.portId) || sourcePorts[0];
        const sIndex = Math.max(0, sourcePorts.findIndex(p => p.id === (sourcePort?.id || connectionStart.portId)));
        const sLeftPct = (sIndex + 1) / (sourcePorts.length + 1);
        const sourceX = sourceNode.position.x + sLeftPct * NODE_WIDTH;
        const sourceY = sourceNode.position.y + (sourcePort?.position === 'bottom' ? NODE_HEIGHT : 0);
        const targetX = tempConnection.x;
        const targetY = tempConnection.y;
        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2;

        const dx = Math.max(40, Math.abs(targetX - sourceX) * 0.25);
        const tempD = routingMode === 'orthogonal'
          ? `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`
          : `M ${sourceX} ${sourceY} C ${sourceX + dx} ${sourceY} ${targetX - dx} ${targetY} ${targetX} ${targetY}`;
        elements.push(
          <g key="temp-connection">
            <path
              d={tempD}
              stroke="#3B82F6"
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
              vectorEffect="non-scaling-stroke"
              className="pointer-events-none"
            />
          </g>
        );
      }
    }

    return elements;
  };

  const getBounds = () => {
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
    
    const xs = nodes.map(n => n.position.x);
    const ys = nodes.map(n => n.position.y);
    const minX = Math.min(0, ...xs) - 50;
    const minY = Math.min(0, ...ys) - 50;
    const maxX = Math.max(800, ...xs.map(x => x + 200)) + 50;
    const maxY = Math.max(600, ...ys.map(y => y + 100)) + 50;
    
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Editor de Workflow</h2>
            <button
              onClick={() => setShowNodePanel(!showNodePanel)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            <div className="font-medium">{workflow.name}</div>
            <div className="text-xs">{workflow.description}</div>
            <div className="mt-2">
              <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs">
                {(workflow as any).type || 'BOT'}
              </span>
            </div>
          </div>

          {(() => {
            const gptNode = nodes.find(n => n.type === 'GPT_RESPONSE');
            const svcNode = nodes.find(n => n.type === 'CONDITION' && (n.content?.condition || '').toLowerCase() === 'service_selection');
            const hasConn = gptNode && svcNode ? connections.some(c => c.source === gptNode.id && c.target === svcNode.id) : true;
            const issues: string[] = [];
            if (!svcNode) issues.push('Adicionar nó CONDIÇÃO "service_selection" para roteamento de intenções.');
            if (gptNode && svcNode && !hasConn) issues.push('Conectar "IA Resposta" → "Condição: service_selection" para fallback controlado.');
            if (issues.length === 0) return null;
            const connectFix = () => {
              if (gptNode && svcNode && !hasConn) {
                setConnections(prev => ([...prev, {
                  id: `conn-${gptNode.id}-${svcNode.id}-${Date.now()}`,
                  source: gptNode.id,
                  sourcePort: 'output',
                  target: svcNode.id,
                  targetPort: 'input'
                }]));
              }
            };
            return (
              <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="text-xs text-yellow-800 font-medium mb-1">Validação do fluxo</div>
                <ul className="text-xs text-yellow-700 list-disc ml-4 mb-2">
                  {issues.map((i, idx) => (<li key={idx}>{i}</li>))}
                </ul>
                <button
                  onClick={connectFix}
                  className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                >Aplicar correção sugerida</button>
              </div>
            );
          })()}
        </div>

        {/* Node Panel */}
        {showNodePanel && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Adicionar Nó</h3>
            <div className="mb-3">
              <input
                aria-label="Buscar tipos de nó"
                value={nodeSearch}
                onChange={(e) => setNodeSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full text-xs border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {nodeTypes.filter(nt => nt.label.toLowerCase().includes(nodeSearch.toLowerCase())).map(({ type, label, icon: Icon, color, description }) => (
                <button
                  key={type}
                  onClick={() => addNode(type as WorkflowNode['type'])}
                  className="flex items-center space-x-2 p-2 text-left hover:bg-white rounded-lg transition-colors border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Adicionar nó ${label}`}
                  title={description}
                >
                  <div className={`w-6 h-6 ${color} rounded flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-900 truncate">{label}</div>
                    <div className="text-[10px] text-gray-500 truncate">{description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Node Properties */}
        {selectedNode && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-blue-900">Propriedades</h3>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => duplicateNode(selectedNode)}
                    className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Duplicar nó"
                    title="Duplicar nó"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteNode(selectedNode.id)}
                    className="p-1 text-red-600 hover:text-red-700 hover:bg-red-100 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label="Excluir nó"
                    title="Excluir nó"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {selectedNode.type === 'MESSAGE' && (
                  <div>
                    <label className="block text-xs font-medium text-blue-900 mb-1">Texto da Mensagem</label>
                    <textarea
                      value={selectedNode.content.text || ''}
                      onChange={(e) => updateNodeContent(selectedNode.id, { text: e.target.value })}
                      className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                      rows={3}
                      placeholder="Digite a mensagem..."
                    />
                  </div>
                )}

                {selectedNode.type === 'CONDITION' && (
                  <div>
                    <label className="block text-xs font-medium text-blue-900 mb-1">Condição</label>
                    <input
                      type="text"
                      value={selectedNode.content.condition || ''}
                      onChange={(e) => updateNodeContent(selectedNode.id, { condition: e.target.value })}
                      className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                      placeholder="message.includes('agendar')"
                    />
                    <p className="text-xs text-blue-700 mt-1">
                      Ex: clinic_selection, service_selection, message.includes("agendar")
                    </p>
                  </div>
                )}

                {selectedNode.type === 'ACTION' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1">Tipo de Ação</label>
                      <input
                        type="text"
                        value={selectedNode.content.action || ''}
                        onChange={(e) => updateNodeContent(selectedNode.id, { action: e.target.value })}
                        className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                        placeholder="schedule_appointment"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1">URL</label>
                      <input
                        type="text"
                        value={selectedNode.content.url || ''}
                        onChange={(e) => updateNodeContent(selectedNode.id, { url: e.target.value })}
                        className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                        placeholder="http://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1">Método</label>
                      <select
                        value={(selectedNode.content.method || 'POST').toUpperCase()}
                        onChange={(e) => updateNodeContent(selectedNode.id, { method: e.target.value })}
                        className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1">Headers (JSON)</label>
                      <textarea
                        value={typeof selectedNode.content.headers === 'string' ? selectedNode.content.headers : JSON.stringify(selectedNode.content.headers || {})}
                        onChange={(e) => {
                          let v: any = e.target.value;
                          try { v = JSON.parse(e.target.value); } catch {}
                          updateNodeContent(selectedNode.id, { headers: v });
                        }}
                        className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                        rows={2}
                        placeholder='{"Content-Type":"application/json"}'
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1">Body (JSON)</label>
                      <textarea
                        value={typeof selectedNode.content.body === 'string' ? selectedNode.content.body : JSON.stringify(selectedNode.content.body || {})}
                        onChange={(e) => {
                          let v: any = e.target.value;
                          try { v = JSON.parse(e.target.value); } catch {}
                          updateNodeContent(selectedNode.id, { body: v });
                        }}
                        className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                        rows={2}
                        placeholder='{"procedure":"Consulta"}'
                      />
                    </div>
                  </div>
                )}

                {selectedNode.type === 'API_CALL' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1">Endpoint</label>
                      <input
                        type="text"
                        value={selectedNode.content.endpoint || ''}
                        onChange={(e) => updateNodeContent(selectedNode.id, { endpoint: e.target.value })}
                        className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                        placeholder="get_clinic_procedures"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1">Mensagem</label>
                      <input
                        type="text"
                        value={selectedNode.content.message || ''}
                        onChange={(e) => updateNodeContent(selectedNode.id, { message: e.target.value })}
                        className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                        placeholder="Buscando informações..."
                      />
                    </div>
                  </div>
                )}

                {selectedNode.type === 'GPT_RESPONSE' && (
                  <div>
                    <label className="block text-xs font-medium text-blue-900 mb-1">Prompt do Sistema</label>
                    <textarea
                      value={selectedNode.content.systemPrompt || ''}
                      onChange={(e) => updateNodeContent(selectedNode.id, { systemPrompt: e.target.value })}
                      className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                      rows={3}
                      placeholder="Você é um assistente de agendamento médico..."
                    />
                  </div>
                )}

                {selectedNode.type === 'DATA_COLLECTION' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1">Campo</label>
                      <select
                        value={selectedNode.content.field || ''}
                        onChange={(e) => updateNodeContent(selectedNode.id, { field: e.target.value })}
                        className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="phone">Telefone</option>
                        <option value="name">Nome</option>
                        <option value="email">Email</option>
                        <option value="insurance">Convênio</option>
                        <option value="procedure">Procedimento</option>
                        <option value="date">Data</option>
                        <option value="time">Horário</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1">Prompt</label>
                      <input
                        type="text"
                        value={selectedNode.content.prompt || ''}
                        onChange={(e) => updateNodeContent(selectedNode.id, { prompt: e.target.value })}
                        className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                        placeholder="Qual é seu número de telefone?"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.type === 'COLLECT_INFO' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1">Campos (separados por vírgula)</label>
                      <input
                        type="text"
                        value={(selectedNode.content.fields || []).join(',')}
                        onChange={(e) => updateNodeContent(selectedNode.id, { fields: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                        placeholder="procedure_type,preferred_date,preferred_time,insurance"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-900 mb-1">Mensagem</label>
                      <input
                        type="text"
                        value={selectedNode.content.message || ''}
                        onChange={(e) => updateNodeContent(selectedNode.id, { message: e.target.value })}
                        className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                        placeholder="Processando dados para agendamento..."
                      />
                    </div>
                  </div>
                )}

                {selectedNode.type === 'DELAY' && (
                  <div>
                    <label className="block text-xs font-medium text-blue-900 mb-1">Delay (segundos)</label>
                    <input
                      type="number"
                      value={selectedNode.content.delay || 0}
                      onChange={(e) => updateNodeContent(selectedNode.id, { delay: parseInt(e.target.value) })}
                      className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                      min="1"
                      max="60"
                    />
                  </div>
                )}

                {(selectedNode.type === 'TRANSFER_HUMAN' || selectedNode.type === 'END') && (
                  <div>
                    <label className="block text-xs font-medium text-blue-900 mb-1">Mensagem Final</label>
                    <input
                      type="text"
                      value={selectedNode.content.finalMessage || ''}
                      onChange={(e) => updateNodeContent(selectedNode.id, { finalMessage: e.target.value })}
                      className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                      placeholder="Mensagem final..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="mt-auto p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={saveWorkflow}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Salvar Workflow"
          >
            <Save className="h-4 w-4" />
            <span>Salvar Workflow</span>
          </button>
          
          <button
            onClick={autoLayout}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Auto-organizar"
          >
            Auto-organizar
          </button>
          
          <button
            onClick={onCancel}
            className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Cancelar"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden" ref={canvasRef}>
        <div 
          className="absolute inset-0 bg-gray-100" 
          onMouseDown={startPan}
          onWheel={handleWheel}
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        >
          {/* Grid */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
              backgroundImage: 'radial-gradient(circle, #9CA3AF 1px, transparent 1px)',
              backgroundSize: `${gridSize}px ${gridSize}px`
          }}
        />

          <div 
            style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, 
              transformOrigin: '0 0',
              width: '100%',
              height: '100%'
            }}
            onMouseMove={(e) => handleMouseMove(e.nativeEvent)}
            onMouseUp={handleMouseUp}
          >
            {/* Connection Lines */}
            {(() => {
              const b = getBounds();
              return (
                <svg
                  ref={svgRef}
                  className="absolute"
                  width={b.width}
                  height={b.height}
                  viewBox={`${b.minX} ${b.minY} ${b.width} ${b.height}`}
                  style={{ zIndex: 1, overflow: 'visible' }}
                >
                  {renderConnections()}
                </svg>
              );
            })()}

            {/* Nodes */}
            {nodes.map(node => {
              const Icon = getNodeIcon(node.type);
              const nodeColor = getNodeColor(node.type);
              
              return (
                <div
                  key={node.id}
                  className={`node-container absolute bg-white rounded-lg shadow-lg border-2 p-3 cursor-move transition-all ${
                    selectedNode?.id === node.id 
                      ? 'border-blue-500 shadow-xl scale-105' 
                      : 'border-gray-200 hover:border-gray-300'
                  } ${connectionStart?.nodeId === node.id ? 'ring-2 ring-blue-400' : ''}`}
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                    width: '200px',
                    height: '100px',
                    zIndex: draggedNode === node.id ? 10 : 2
                  }}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 ${nodeColor} rounded-lg flex items-center justify-center`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateNode(node);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Duplicar nó"
                        title="Duplicar"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNode(node.id);
                        }}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label="Excluir nó"
                        title="Excluir"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs font-medium text-gray-900 mb-1">
                    {nodeTypes.find(nt => nt.type === node.type)?.label}
                  </div>
                  
                  {node.content.text && (
                    <div className="text-xs text-gray-600 line-clamp-2 mb-2">
                      {node.content.text}
                    </div>
                  )}
                  
                  {node.content.condition && (
                    <div className="text-xs text-gray-600 mb-2">
                      Se: {node.content.condition}
                    </div>
                  )}
                  
                  {node.content.field && (
                    <div className="text-xs text-gray-600 mb-2">
                      Coletar: {node.content.field}
                    </div>
                  )}
                  
                  {node.content.delay && (
                    <div className="text-xs text-gray-600 mb-2">
                      Aguardar: {node.content.delay}s
                    </div>
                  )}

                  {node.content.ports?.filter(p => p.type === 'input').map((port, idx, inputs) => (
                    <div
                      key={port.id}
                      className={`absolute -top-2 transform -translate-x-1/2 w-4 h-4 rounded-full border-2 z-10 ${
                        connectionStart?.nodeId === node.id && connectionStart.portId === port.id
                          ? 'bg-blue-500 border-blue-600'
                          : 'bg-white border-gray-400 hover:border-blue-500'
                      } cursor-pointer`}
                      style={{ left: `${((idx + 1) / (inputs.length + 1)) * 100}%` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (connectionStart) {
                          completeConnection(node.id, port.id, 'input');
                        } else {
                          startConnection(node.id, port.id, 'input');
                        }
                      }}
                      title={port.label}
                      aria-label={`Porta de entrada ${port.label}`}
                    />
                  ))}

                  {/* Output Ports */}
                  {node.content.ports?.filter(p => p.type === 'output').map((port, idx, outputs) => (
                    <div
                      key={port.id}
                      className={`absolute -bottom-2 transform -translate-x-1/2 w-4 h-4 rounded-full border-2 z-10 ${
                        connectionStart?.nodeId === node.id && connectionStart.portId === port.id
                          ? 'bg-blue-500 border-blue-600'
                          : 'bg-white border-gray-400 hover:border-blue-500'
                      } cursor-pointer`}
                      style={{ left: `${((idx + 1) / (outputs.length + 1)) * 100}%` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (connectionStart) {
                          completeConnection(node.id, port.id, 'output');
                        } else {
                          startConnection(node.id, port.id, 'output');
                        }
                      }}
                      title={port.label}
                      aria-label={`Porta de saída ${port.label}`}
                    />
                  ))}
                  {showPortLabels && (
                    <div className="absolute left-1/2 -translate-x-1/2 text-[10px] text-gray-500" style={{ top: -16 }}>
                      Entrada
                    </div>
                  )}
                  {showPortLabels && (
                    <div className="absolute left-1/2 -translate-x-1/2 text-[10px] text-gray-500" style={{ bottom: -16 }}>
                      Saída
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2 space-y-1">
          <button
            onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            aria-label="Aumentar zoom"
            title="Aumentar zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            aria-label="Diminuir zoom"
            title="Diminuir zoom"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            aria-label="Resetar zoom"
            title="Resetar zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 space-x-2">
            <span className="text-xs text-gray-600">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setSnapEnabled(s => !s)}
              className={`text-xs px-2 py-1 rounded ${snapEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
              aria-label="Alternar snap"
            >
              Snap
            </button>
            <button
              onClick={() => setRoutingMode(m => (m === 'bezier' ? 'orthogonal' : 'bezier'))}
              className={`text-xs px-2 py-1 rounded ${routingMode === 'orthogonal' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
              aria-label="Alternar roteamento"
            >
              {routingMode === 'orthogonal' ? 'Orto' : 'Curva'}
            </button>
            <button
              onClick={() => setShowPortLabels(s => !s)}
              className={`text-xs px-2 py-1 rounded ${showPortLabels ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
              aria-label="Alternar rótulos de portas"
            >
              Portas
            </button>
            <select
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              className="text-xs border border-gray-300 rounded px-1 py-0.5"
              aria-label="Tamanho da grade"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={40}>40</option>
            </select>
          </div>
        </div>

        {/* Minimap */}
        <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur rounded-lg border border-gray-300 shadow p-2" style={{ width: 160, height: 120 }}>
          {(() => {
            const b = getBounds();
            const scale = Math.min(140 / b.width, 100 / b.height);
            const offsetX = (160 - b.width * scale) / 2;
            const offsetY = (120 - b.height * scale) / 2;
            
            return (
              <svg width={160} height={120} viewBox={`0 0 160 120`}>
                {nodes.map(n => (
                  <rect 
                    key={`m-${n.id}`} 
                    x={offsetX + (n.position.x - b.minX) * scale} 
                    y={offsetY + (n.position.y - b.minY) * scale} 
                    width={20 * scale} 
                    height={12 * scale} 
                    fill="#93C5FD" 
                    stroke="#3B82F6" 
                    strokeWidth={0.5} 
                    rx={2} 
                  />
                ))}
                <rect 
                  x={offsetX + (-pan.x - b.minX) * scale} 
                  y={offsetY + (-pan.y - b.minY) * scale} 
                  width={160 / zoom * scale} 
                  height={120 / zoom * scale} 
                  fill="none" 
                  stroke="#EF4444" 
                  strokeWidth={1} 
                />
              </svg>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export { WorkflowEditor };
export default WorkflowEditor;
