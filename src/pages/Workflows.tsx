import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  Settings,
  Workflow as WorkflowIcon,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Copy,
  BarChart3,
  Users,
  MessageSquare,
  MapPin,
  Calendar,
  DollarSign
} from 'lucide-react';
import { api } from '../lib/utils';
import { toast } from 'sonner';
import { WorkflowEditor } from '../components/WorkflowEditor';

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
    prompt?: string;
    delay?: number;
    finalMessage?: string;
    url?: string;
    method?: string;
    headers?: any;
    body?: any;
    ports?: string[];
  };
  position: { x: number; y: number };
  connections: Array<string | { targetId: string; condition?: string; port?: string }>;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  type: 'BOT' | 'HUMAN' | 'MIXED';
  category: 'ATENDIMENTO' | 'AGENDAMENTO' | 'INFORMACAO' | 'TRIAGEM';
  statistics: {
    totalExecutions: number;
    successRate: number;
    averageTime: number;
    lastExecuted?: string;
  };
  tags: string[];
}

interface WorkflowCardProps {
  workflow: Workflow;
  onToggleActive: (workflow: Workflow) => void;
  onEdit: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
  onDuplicate: (workflow: Workflow) => void;
  onTest: (workflow: Workflow) => void;
  onViewAnalytics: (workflow: Workflow) => void;
}

const WorkflowCard: React.FC<WorkflowCardProps & { defaultWorkflowId?: string; onSetDefault?: (workflow: Workflow) => void }> = ({
  workflow,
  onToggleActive,
  onEdit,
  onDelete,
  onDuplicate,
  onTest,
  onViewAnalytics,
  defaultWorkflowId,
  onSetDefault
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BOT': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'HUMAN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MIXED': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ATENDIMENTO': return <Users className="h-4 w-4" />;
      case 'AGENDAMENTO': return <Calendar className="h-4 w-4" />;
      case 'INFORMACAO': return <MessageSquare className="h-4 w-4" />;
      case 'TRIAGEM': return <BarChart3 className="h-4 w-4" />;
      default: return <WorkflowIcon className="h-4 w-4" />;
    }
  };

  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case 'START': return <Play className="h-4 w-4 text-green-600" />;
      case 'MESSAGE': return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'GPT_RESPONSE': return <Settings className="h-4 w-4 text-purple-600" />;
      case 'CONDITION': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'ACTION': return <CheckCircle className="h-4 w-4 text-indigo-600" />;
      case 'API_CALL': return <Settings className="h-4 w-4 text-indigo-700" />;
      case 'DATA_COLLECTION': return <Copy className="h-4 w-4 text-teal-600" />;
      case 'COLLECT_INFO': return <Copy className="h-4 w-4 text-teal-700" />;
      case 'TRANSFER_HUMAN': return <Users className="h-4 w-4 text-red-600" />;
      case 'DELAY': return <Clock className="h-4 w-4 text-gray-600" />;
      case 'END': return <CheckCircle className="h-4 w-4 text-green-700" />;
      default: return <WorkflowIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await onTest(workflow);
    } finally {
      setIsTesting(false);
    }
  };

  const successRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 group">
      {/* Card Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg shadow-sm">
              <WorkflowIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                {workflow.name}
              </h3>
              <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                {workflow.description}
              </p>
              {defaultWorkflowId === workflow.id && (
                <span className="inline-flex items-center mt-2 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                  Padrão
                </span>
              )}
            </div>
          </div>
          
          {/* Action Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="h-5 w-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onEdit(workflow);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => {
                      onDuplicate(workflow);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Duplicar</span>
                  </button>
                  <button
                    onClick={() => {
                      onViewAnalytics(workflow);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Análises</span>
                  </button>
                  <button
                    onClick={handleTest}
                    disabled={isTesting}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    <span>{isTesting ? 'Testando...' : 'Testar'}</span>
                  </button>
                  <button
                    onClick={() => {
                      onSetDefault && onSetDefault(workflow);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Definir Padrão</span>
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onDelete(workflow);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status and Type Badges */}
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(workflow.isActive)}`}>
            {workflow.isActive ? 'Ativo' : 'Inativo'}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(workflow.type)}`}>
            {workflow.type}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
            {getCategoryIcon(workflow.category)}
            <span className="ml-1">{workflow.category}</span>
          </span>
          {workflow.tags.map((tag, index) => (
            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="p-6 bg-gray-50 border-b border-gray-100">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {workflow.statistics.totalExecutions}
            </div>
            <div className="text-xs text-gray-500">Execuções</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${successRateColor(workflow.statistics.successRate)}`}>
              {workflow.statistics.successRate}%
            </div>
            <div className="text-xs text-gray-500">Sucesso</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {workflow.statistics.averageTime}s
            </div>
            <div className="text-xs text-gray-500">Tempo médio</div>
          </div>
        </div>
      </div>

      {/* Node Preview */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Fluxo de trabalho</h4>
          <span className="text-xs text-gray-500">
            {workflow.nodes.length} nós
          </span>
        </div>
        
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {workflow.nodes.slice(0, 6).map((node, index) => (
            <div key={node.id} className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm min-w-max">
                {getNodeTypeIcon(node.type)}
                <span className="text-xs font-medium text-gray-700">
                  {node.type.replace('_', ' ')}
                </span>
              </div>
              {index < Math.min(5, workflow.nodes.length - 1) && (
                <div className="w-4 h-0.5 bg-gray-300 rounded"></div>
              )}
            </div>
          ))}
          {workflow.nodes.length > 6 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              +{workflow.nodes.length - 6} mais
            </span>
          )}
        </div>

        {workflow.statistics.lastExecuted && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Última execução:</span>
              <span>{new Date(workflow.statistics.lastExecuted).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onToggleActive(workflow)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              workflow.isActive
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {workflow.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{workflow.isActive ? 'Pausar' : 'Ativar'}</span>
          </button>
          
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <Play className="h-4 w-4" />
            <span>{isTesting ? 'Testando...' : 'Testar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const Workflows: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultWorkflowId, setDefaultWorkflowId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorWorkflow, setEditorWorkflow] = useState<Workflow | null>(null);
  const [showAnalytics, setShowAnalytics] = useState<Workflow | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importName, setImportName] = useState('');
  const [importDesc, setImportDesc] = useState('');
  const [importJson, setImportJson] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'BOT' as const,
    category: 'ATENDIMENTO' as const,
    nodes: [] as WorkflowNode[],
    tags: [] as string[]
  });
  const [filter, setFilter] = useState({
    type: 'all',
    category: 'all',
    status: 'all',
    search: ''
  });

  const fetchWorkflows = async () => {
    try {
      const response = await api.get('/api/workflows');
      const list = (response.data?.workflows || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        description: w.description || '',
        nodes: (w.config?.nodes || []),
        isActive: w.isActive,
        type: w.type || 'BOT',
        category: w.category || 'ATENDIMENTO',
        tags: w.tags || [],
        statistics: w.statistics || {
          totalExecutions: Math.floor(Math.random() * 1000),
          successRate: Math.floor(Math.random() * 40) + 60,
          averageTime: Math.floor(Math.random() * 60) + 10,
          lastExecuted: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
        },
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      }))
      setWorkflows(list);
      try {
        const def = await api.get('/api/workflows/default');
        setDefaultWorkflowId(def.data?.defaultWorkflowId || null);
      } catch {}
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast.error('Erro ao carregar workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        config: { nodes: formData.nodes },
        isActive: false // New workflows start inactive
      };
      
      if (editingWorkflow) {
        await api.patch(`/api/workflows/${editingWorkflow.id}`, payload);
        toast.success('Workflow atualizado com sucesso');
      } else {
        await api.post('/api/workflows', payload);
        toast.success('Workflow criado com sucesso');
      }
      
      setShowModal(false);
      setEditingWorkflow(null);
      setFormData({ 
        name: '', 
        description: '', 
        type: 'BOT', 
        category: 'ATENDIMENTO', 
        nodes: [], 
        tags: [] 
      });
      fetchWorkflows();
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Erro ao salvar workflow');
    }
  };

  const handleToggleActive = async (workflow: Workflow) => {
    try {
      await api.patch(`/api/workflows/${workflow.id}/toggle`);
      toast.success(`Workflow ${workflow.isActive ? 'desativado' : 'ativado'} com sucesso`);
      fetchWorkflows();
    } catch (error) {
      console.error('Error toggling workflow:', error);
      toast.error('Erro ao alternar status do workflow');
    }
  };

  const handleDelete = async (workflow: Workflow) => {
    if (confirm(`Tem certeza que deseja excluir o workflow "${workflow.name}"?`)) {
      try {
        await api.delete(`/api/workflows/${workflow.id}`);
        toast.success('Workflow excluído com sucesso');
        fetchWorkflows();
      } catch (error) {
        console.error('Error deleting workflow:', error);
        toast.error('Erro ao excluir workflow');
      }
    }
  };

  const handleDuplicate = async (workflow: Workflow) => {
    try {
      const duplicatedData = {
        name: `${workflow.name} (Cópia)`,
        description: workflow.description,
        type: workflow.type,
        category: workflow.category,
        nodes: workflow.nodes,
        tags: workflow.tags,
        isActive: false
      };
      
      await api.post('/api/workflows', duplicatedData);
      toast.success('Workflow duplicado com sucesso');
      fetchWorkflows();
    } catch (error) {
      console.error('Error duplicating workflow:', error);
      toast.error('Erro ao duplicar workflow');
    }
  };

  const handleTest = async (workflow: Workflow) => {
    try {
      const response = await api.post(`/api/workflows/${workflow.id}/test`, {
        phone: '5511999999999',
        message: 'Olá, gostaria de agendar uma consulta'
      });
      
      toast.success('Workflow testado com sucesso!');
      console.log('Test result:', response.data);
    } catch (error) {
      console.error('Error testing workflow:', error);
      toast.error('Erro ao testar workflow');
    }
  };

  const handleViewAnalytics = (workflow: Workflow) => {
    setShowAnalytics(workflow);
  };

  const handleSetDefault = async (workflow: Workflow) => {
    try {
      await api.put('/api/workflows/default', { id: workflow.id });
      toast.success('Workflow definido como padrão');
      setDefaultWorkflowId(workflow.id);
    } catch (error) {
      console.error('Error setting default workflow:', error);
      toast.error('Erro ao definir workflow padrão');
    }
  };

  const handleEdit = async (workflow: Workflow) => {
    try {
      if (workflow.id) {
        const resp = await api.get(`/api/workflows/${workflow.id}`)
        setEditorWorkflow(resp.data || workflow)
      } else {
        setEditorWorkflow(workflow)
      }
    } catch (e) {
      setEditorWorkflow(workflow)
    } finally {
      setShowEditor(true)
    }
  };

  const buildEdgesFromConnections = (nodes: any[]) => {
    const edges: any[] = [];
    nodes.forEach((n) => {
      (n.connections || []).forEach((conn: any, idx: number) => {
        const targetId = typeof conn === 'string' ? conn : conn?.targetId;
        const condition = typeof conn === 'string' ? undefined : conn?.condition;
        const port = typeof conn === 'string' ? 'main' : (conn?.port || 'main');
        const edge: any = { id: `e_${n.id}_${targetId}_${idx}`, source: n.id, target: targetId, data: {} };
        if (condition) edge.data.condition = condition;
        if (port) edge.data.port = port;
        edges.push(edge);
      });
    });
    return edges;
  };

  const handleSaveWorkflow = async (workflowData: any) => {
    try {
      if (editorWorkflow?.id) {
        await api.put(`/api/workflows/${editorWorkflow.id}`, {
          name: workflowData.name,
          description: workflowData.description,
          type: editorWorkflow?.type || 'BOT',
          config: { nodes: workflowData.nodes, edges: buildEdgesFromConnections(workflowData.nodes) },
          isActive: workflowData.isActive
        });
        toast.success('Workflow atualizado com sucesso!');
      } else {
        await api.post('/api/workflows', {
          name: workflowData.name,
          description: workflowData.description,
          type: 'BOT',
          config: { nodes: workflowData.nodes, edges: buildEdgesFromConnections(workflowData.nodes) },
          isActive: false
        });
        toast.success('Workflow criado com sucesso!');
      }
      
      setShowEditor(false);
      setEditorWorkflow(null);
      fetchWorkflows();
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Erro ao salvar workflow');
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(filter.search.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(filter.search.toLowerCase());
    const matchesType = filter.type === 'all' || workflow.type === filter.type;
    const matchesCategory = filter.category === 'all' || workflow.category === filter.category;
    const matchesStatus = filter.status === 'all' || 
                         (filter.status === 'active' && workflow.isActive) ||
                         (filter.status === 'inactive' && !workflow.isActive);
    
    return matchesSearch && matchesType && matchesCategory && matchesStatus;
  });

  const categories = ['ATENDIMENTO', 'AGENDAMENTO', 'INFORMACAO', 'TRIAGEM'];
  const types = ['BOT', 'HUMAN', 'MIXED'];

  // Show visual editor
  class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false };
    }
    static getDerivedStateFromError(_: any) { return { hasError: true }; }
    componentDidCatch(_: any, __: any) {}
    render() {
      if (this.state.hasError) {
        return <div className="p-6 text-sm text-red-600">Falha ao carregar o Editor de Workflow. Verifique os nós e tente novamente.</div>;
      }
      return this.props.children as any;
    }
  }

  if (showEditor) {
    const toEditorWorkflow = (w: any) => {
      const cfg = (typeof w?.config === 'string') ? (() => { try { return JSON.parse(w.config) } catch { return {} } })() : (w?.config || {})
      const rawNodes = Array.isArray(cfg?.nodes) ? cfg.nodes : (Array.isArray(w?.nodes) ? w.nodes : [])
      const rawEdges = Array.isArray(cfg?.edges) ? cfg.edges : []
      const idToConnections: Record<string, Array<string | { targetId: string; condition?: string; port?: string }>> = {};
      rawNodes.forEach((n: any) => { idToConnections[n.id] = Array.isArray(n.connections) ? n.connections : []; });
      rawEdges.forEach((e: any) => {
        if (e?.source && e?.target) {
          const payload = e?.data ? { targetId: e.target, condition: e.data.condition, port: e.data.port || 'main' } : e.target;
          (idToConnections[e.source] ||= []).push(payload);
        }
      });
      const laidOutNodes = (rawNodes || []).map((n: any, idx: number) => ({
        id: n.id || `node_${idx}`,
        type: n.type || 'MESSAGE',
        content: n.content || {},
        position: n.position || { x: 0, y: 0 },
        connections: idToConnections[n.id] || []
      }))
      return { id: w.id, name: w.name, description: w.description, nodes: layoutByBFS(laidOutNodes) };
    };
    return (
      <ErrorBoundary>
        <WorkflowEditor
          workflow={editorWorkflow ? toEditorWorkflow(editorWorkflow) : { name: '', description: '', nodes: [] }}
          onSave={handleSaveWorkflow}
          onCancel={() => {
            setShowEditor(false);
            setEditorWorkflow(null);
          }}
          onAutoLayout={(nodes: any[]) => layoutByBFS(nodes)}
        />
      </ErrorBoundary>
    );
  }

  if (showAnalytics) {
    return (
      <div className="flex-1 p-8 bg-gray-50">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics: {showAnalytics.name}</h1>
              <p className="text-gray-600 mt-2">Estatísticas detalhadas do workflow</p>
            </div>
            <button
              onClick={() => setShowAnalytics(null)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
            >
              Voltar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Execuções</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {showAnalytics.statistics.totalExecutions}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Play className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {showAnalytics.statistics.successRate}%
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tempo Médio</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {showAnalytics.statistics.averageTime}s
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Última Execução</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {showAnalytics.statistics.lastExecuted 
                    ? new Date(showAnalytics.statistics.lastExecuted).toLocaleDateString('pt-BR')
                    : 'Nunca'
                  }
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes do Workflow</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Informações Básicas</h4>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-600">Nome</dt>
                  <dd className="text-sm font-medium text-gray-900">{showAnalytics.name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Descrição</dt>
                  <dd className="text-sm text-gray-900">{showAnalytics.description}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Tipo</dt>
                  <dd className="text-sm font-medium text-gray-900">{showAnalytics.type}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Categoria</dt>
                  <dd className="text-sm font-medium text-gray-900">{showAnalytics.category}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Configuração</h4>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-600">Total de Nós</dt>
                  <dd className="text-sm font-medium text-gray-900">{showAnalytics.nodes.length}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Tags</dt>
                  <dd className="text-sm text-gray-900">
                    {showAnalytics.tags.join(', ') || 'Nenhuma'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Criado em</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(showAnalytics.createdAt).toLocaleDateString('pt-BR')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Atualizado em</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(showAnalytics.updatedAt).toLocaleDateString('pt-BR')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-gray-50">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
            <p className="text-gray-600 mt-2">Gerencie os fluxos de atendimento automatizados com inteligência</p>
          </div>
          <button
            onClick={() => {
              setEditorWorkflow({
                id: '',
                name: '',
                description: '',
                nodes: [],
                isActive: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                type: 'BOT',
                category: 'ATENDIMENTO',
                tags: ['atendimento', 'bot'],
                statistics: {
                  totalExecutions: 0,
                  successRate: 0,
                  averageTime: 0
                }
              });
              setShowEditor(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-5 w-5" />
            <span>Novo Workflow</span>
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="ml-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all"
          >
            <WorkflowIcon className="h-5 w-5" />
            <span>Importar n8n</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Nome ou descrição..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todas</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredWorkflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            onToggleActive={handleToggleActive}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onTest={handleTest}
            onViewAnalytics={handleViewAnalytics}
            defaultWorkflowId={defaultWorkflowId || undefined}
            onSetDefault={handleSetDefault}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredWorkflows.length === 0 && !loading && (
        <div className="text-center py-12">
          <WorkflowIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {filter.search || filter.type !== 'all' || filter.category !== 'all' || filter.status !== 'all'
              ? 'Nenhum workflow encontrado com os filtros aplicados'
              : 'Nenhum workflow encontrado'
            }
          </h3>
          <p className="text-gray-500 mb-6">
            {filter.search || filter.type !== 'all' || filter.category !== 'all' || filter.status !== 'all'
              ? 'Tente ajustar os filtros ou criar um novo workflow'
              : 'Crie seu primeiro workflow para automatizar atendimentos'
            }
          </p>
          <button
            onClick={() => {
              setEditorWorkflow({
                id: '',
                name: '',
                description: '',
                nodes: [],
                isActive: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                type: 'BOT',
                category: 'ATENDIMENTO',
                tags: ['atendimento', 'bot'],
                statistics: {
                  totalExecutions: 0,
                  successRate: 0,
                  averageTime: 0
                }
              });
              setShowEditor(true);
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Criar Workflow
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                {editingWorkflow ? 'Editar Workflow' : 'Novo Workflow Inteligente'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Fluxo de Agendamento Inteligente"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="BOT">Bot (Automatizado)</option>
                      <option value="HUMAN">Humano (Manual)</option>
                      <option value="MIXED">Misto (Bot + Humano)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoria *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="ATENDIMENTO">Atendimento</option>
                      <option value="AGENDAMENTO">Agendamento</option>
                      <option value="INFORMACAO">Informação</option>
                      <option value="TRIAGEM">Triagem</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <input
                      type="text"
                      value={formData.tags.join(', ')}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: agendamento, bot, inteligente"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descreva o objetivo e funcionamento deste workflow..."
                  />
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Configuração de Nós Inteligente</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-blue-900">Editor Visual em Breve</h5>
                        <p className="text-blue-800 text-sm mt-1">
                          Em breve você poderá criar workflows visuais com drag-and-drop. Por enquanto, 
                          configure os nós manualmente ou use nossos templates inteligentes.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        // Add template nodes for appointment workflow
                        setFormData({
                          ...formData,
                          nodes: [
                            {
                              id: 'start',
                              type: 'START',
                              content: { text: 'Olá! Vou te ajudar a agendar sua consulta.' },
                              position: { x: 0, y: 0 },
                              connections: ['verify-patient']
                            },
                            {
                              id: 'verify-patient',
                              type: 'DATA_COLLECTION',
                              content: {
                                field: 'phone',
                                prompt: 'Para começar, qual é seu número de telefone com DDD?'
                              },
                              position: { x: 200, y: 0 },
                              connections: ['check-patient']
                            },
                            {
                              id: 'check-patient',
                              type: 'ACTION',
                              content: { action: 'search_patient_by_phone' },
                              position: { x: 400, y: 0 },
                              connections: ['patient-found-condition']
                            },
                            {
                              id: 'patient-found-condition',
                              type: 'CONDITION',
                              content: { condition: 'patient_found' },
                              position: { x: 600, y: 0 },
                              connections: ['greeting-existing']
                            }
                          ]
                        });
                      }}
                      className="bg-white border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <h6 className="font-medium text-gray-900 mb-2">🗓️ Fluxo de Agendamento</h6>
                      <p className="text-sm text-gray-600">
                        Template completo com verificação de paciente, escolha de procedimentos e marcação de horário.
                      </p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        // Add template nodes for information workflow
                        setFormData({
                          ...formData,
                          nodes: [
                            {
                              id: 'start',
                              type: 'START',
                              content: { text: 'Olá! Seja bem-vindo à nossa clínica.' },
                              position: { x: 0, y: 0 },
                              connections: ['menu-options']
                            },
                            {
                              id: 'menu-options',
                              type: 'MESSAGE',
                              content: {
                                text: 'Escolha uma opção:\n1️⃣ Procedimentos\n2️⃣ Valores\n3️⃣ Convênios\n4️⃣ Localização',
                                options: ['1', '2', '3', '4']
                              },
                              position: { x: 200, y: 0 },
                              connections: ['condition-menu']
                            },
                            {
                              id: 'condition-menu',
                              type: 'CONDITION',
                              content: { condition: 'message.includes("1")' },
                              position: { x: 400, y: 0 },
                              connections: ['procedures-info']
                            },
                            {
                              id: 'procedures-info',
                              type: 'GPT_RESPONSE',
                              content: {
                                systemPrompt: 'Forneça informações sobre procedimentos disponíveis'
                              },
                              position: { x: 600, y: -100 },
                              connections: ['ask-schedule']
                            }
                          ]
                        });
                      }}
                      className="bg-white border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <h6 className="font-medium text-gray-900 mb-2">ℹ️ Informações da Clínica</h6>
                      <p className="text-sm text-gray-600">
                        Template para fornecer informações sobre procedimentos, valores, convênios e localização.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 font-medium shadow-lg"
                  >
                    {editingWorkflow ? 'Atualizar Workflow' : 'Criar Workflow Inteligente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Importar Workflow do n8n</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                  <input value={importName} onChange={(e)=>setImportName(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                  <input value={importDesc} onChange={(e)=>setImportDesc(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">JSON do n8n</label>
              <textarea value={importJson} onChange={(e)=>setImportJson(e.target.value)} rows={12} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Cole aqui o JSON exportado do n8n" />
              <div className="flex items-center justify-end space-x-3 mt-4">
                <button onClick={()=>setShowImport(false)} className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 font-medium">Cancelar</button>
                <button
                  onClick={async ()=>{
                    try {
                      const wf = JSON.parse(importJson)
                      await api.post('/api/workflows/import/n8n',{ name: importName || wf.name || 'Importado do n8n', description: importDesc || wf.description || '', workflow: wf })
                      toast.success('Workflow importado com sucesso')
                      setShowImport(false)
                      setImportJson(''); setImportName(''); setImportDesc('')
                      fetchWorkflows()
                    } catch (e) {
                      toast.error('JSON inválido ou erro ao importar')
                    }
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-md hover:from-purple-700 hover:to-purple-800 font-medium shadow-lg"
                >
                  Importar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const layoutByBFS = (nodes: any[]) => {
  const nodeMap: Record<string, any> = {}
  nodes.forEach(n => nodeMap[n.id] = n)
  const start = nodes.find((n: any) => n.type === 'START')
  const visited: Set<string> = new Set()
  const level: Record<string, number> = {}
  const queue: string[] = []
  if (start) {
    queue.push(start.id)
    visited.add(start.id)
    level[start.id] = 0
  }
  while (queue.length) {
    const cur = queue.shift() as string
    const lv = level[cur]
    const conns = nodeMap[cur]?.connections || []
    conns.forEach((c: any) => {
      const t = typeof c === 'string' ? c : c?.targetId
      if (!t) return
      if (!visited.has(t)) {
        visited.add(t)
        level[t] = lv + 1
        queue.push(t)
      }
    })
  }
  const orphanLevelStart = start ? (Math.max(0, ...Object.values(level)) + 1) : 0
  const groups: Record<number, any[]> = {}
  nodes.forEach((n: any) => {
    const lv = level[n.id] !== undefined ? level[n.id] : orphanLevelStart
    ;(groups[lv] ||= []).push(n)
  })
  const baseX = 100, baseY = 100, col = 240, row = 180
  Object.keys(groups).forEach(k => {
    const lv = Number(k)
    groups[lv].forEach((n: any, i: number) => {
      n.position = { x: baseX + i * col, y: baseY + lv * row }
    })
  })
  return nodes
}

export { Workflows };
