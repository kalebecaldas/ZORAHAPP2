import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Settings, 
  Bot, 
  Calendar, 
  Phone, 
  MapPin, 
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  MessageSquare,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  Copy,
  ArrowRight
} from 'lucide-react';
import { api } from '../lib/utils';
import { toast } from 'sonner';

interface WorkflowExecution {
  id: string;
  workflowId: string;
  conversationId: string;
  patientPhone: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'WAITING_INPUT';
  currentNodeId: string;
  context: {
    patientName?: string;
    patientPhone?: string;
    preferredDate?: string;
    preferredTime?: string;
    preferredLocation?: string;
    selectedProcedure?: string;
    insuranceCompany?: string;
    collectedData: Record<string, any>;
  };
  executionHistory: Array<{
    nodeId: string;
    nodeType: string;
    executedAt: string;
    result: any;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowExecutionProps {
  conversationId: string;
  patientPhone: string;
  workflowId?: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

const WorkflowExecution: React.FC<WorkflowExecutionProps> = ({
  conversationId,
  patientPhone,
  workflowId,
  onComplete,
  onError
}) => {
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMessage, setCurrentMessage] = useState('');
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const startWorkflow = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/workflows/start', {
        conversationId,
        patientPhone,
        workflowId: workflowId || 'default'
      });
      
      setExecution(response.data.execution);
      setLoading(false);
      
      if (response.data.execution.status === 'WAITING_INPUT') {
        setWaitingForInput(true);
        setCurrentMessage(getInputPrompt(response.data.execution));
      }
      
    } catch (error) {
      console.error('Error starting workflow:', error);
      toast.error('Erro ao iniciar fluxo de trabalho');
      onError?.('Erro ao iniciar fluxo de trabalho');
      setLoading(false);
    }
  };

  const continueWorkflow = async (input?: string) => {
    if (!execution) return;

    try {
      const response = await api.post(`/api/workflows/continue/${execution.id}`, {
        input,
        conversationId
      });
      
      setExecution(response.data.execution);
      setWaitingForInput(false);
      setInputValue('');
      
      if (response.data.execution.status === 'WAITING_INPUT') {
        setWaitingForInput(true);
        setCurrentMessage(getInputPrompt(response.data.execution));
      } else if (response.data.execution.status === 'COMPLETED') {
        toast.success('Fluxo de trabalho concluído com sucesso!');
        onComplete?.();
      } else if (response.data.execution.status === 'FAILED') {
        toast.error('Erro na execução do fluxo de trabalho');
        onError?.('Erro na execução do fluxo de trabalho');
      }
      
    } catch (error) {
      console.error('Error continuing workflow:', error);
      toast.error('Erro ao continuar fluxo de trabalho');
      onError?.('Erro ao continuar fluxo de trabalho');
    }
  };

  const getInputPrompt = (exec: WorkflowExecution): string => {
    const lastNode = exec.executionHistory[exec.executionHistory.length - 1];
    if (lastNode?.result?.prompt) {
      return lastNode.result.prompt;
    }
    
    // Handle appointment booking node
    if (lastNode?.result?.type === 'appointment_booking') {
      const availableDates = lastNode.result.availableDates || [];
      const availableTimes = lastNode.result.availableTimes || [];
      const locations = lastNode.result.locations || [];
      
      if (!exec.context.preferredDate && availableDates.length > 0) {
        return `Por favor, escolha uma data disponível: ${availableDates.join(', ')}`;
      } else if (!exec.context.preferredTime && availableTimes.length > 0) {
        return `Por favor, escolha um horário disponível: ${availableTimes.join(', ')}`;
      } else if (!exec.context.preferredLocation && locations.length > 0) {
        return `Por favor, escolha uma unidade: ${locations.join(', ')}`;
      }
    }
    
    // Default prompts based on context
    if (!exec.context.collectedData.name) {
      return 'Qual é seu nome completo?';
    } else if (!exec.context.collectedData.phone) {
      return 'Qual é seu número de telefone com DDD?';
    } else if (!exec.context.collectedData.insurance) {
      return 'Qual é seu convênio médico? (ou digite "particular" se não tiver)';
    } else if (!exec.context.selectedProcedure) {
      return 'Qual procedimento você gostaria de agendar?';
    } else if (!exec.context.preferredDate) {
      return 'Qual é a melhor data para você? (formato: DD/MM/AAAA)';
    } else if (!exec.context.preferredTime) {
      return 'Qual é o melhor horário para você? (manhã, tarde ou noite)';
    } else if (!exec.context.preferredLocation) {
      return 'Qual unidade você prefere?';
    }
    
    return 'Por favor, forneça as informações solicitadas:';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'WAITING_INPUT':
        return <MessageSquare className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'WAITING_INPUT':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  useEffect(() => {
    startWorkflow();
  }, [conversationId, workflowId]);

  useEffect(() => {
    if (!execution) return;

    const interval = setInterval(async () => {
      if (execution.status === 'RUNNING') {
        try {
          const response = await api.get(`/api/workflows/execution/${execution.id}`);
          setExecution(response.data.execution);
          
          if (response.data.execution.status === 'WAITING_INPUT') {
            setWaitingForInput(true);
            setCurrentMessage(getInputPrompt(response.data.execution));
          }
        } catch (error) {
          console.error('Error fetching execution status:', error);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [execution?.id, execution?.status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Iniciando fluxo de trabalho...</span>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao iniciar fluxo de trabalho</h3>
        <p className="text-gray-600">Não foi possível iniciar o fluxo de trabalho. Tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(execution.status)}
            <div>
              <h3 className="font-semibold text-gray-900">Fluxo de Trabalho Inteligente</h3>
              <p className="text-sm text-gray-600">
                Executando para {execution.patientPhone}
              </p>
            </div>
          </div>
          
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(execution.status)}`}>
            {execution.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Current Step */}
      <div className="p-6">
        {execution.executionHistory.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Progresso</h4>
            <div className="space-y-2">
              {execution.executionHistory.slice(-3).map((step, index) => (
                <div key={index} className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <span className="text-gray-900">
                      {step.nodeType.replace('_', ' ')}: 
                      {step.result?.message || step.result?.prompt || 'Executado'}
                    </span>
                    <span className="text-gray-500 ml-2">
                      {formatTimeAgo(step.executedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Message */}
        {currentMessage && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <Bot className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h5 className="font-medium text-blue-900 mb-1">Mensagem do Sistema</h5>
                <p className="text-blue-800 text-sm">{currentMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        {waitingForInput && (
          <div className="space-y-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && continueWorkflow(inputValue)}
              placeholder="Digite sua resposta..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => continueWorkflow(inputValue)}
                disabled={!inputValue.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <ArrowRight className="h-4 w-4" />
                <span>Enviar</span>
              </button>
              
              <button
                onClick={() => continueWorkflow()}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Pular
              </button>
            </div>
          </div>
        )}

        {/* Context Info */}
        {Object.keys(execution.context.collectedData).length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Informações Coletadas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {Object.entries(execution.context.collectedData).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600 capitalize">{key}:</span>
                  <span className="font-medium text-gray-900">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>ID: {execution.id}</span>
          <span>Iniciado {formatTimeAgo(execution.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

export { WorkflowExecution };
export default WorkflowExecution;