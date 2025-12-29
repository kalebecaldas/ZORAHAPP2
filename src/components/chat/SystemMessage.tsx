import React from 'react';
import {
    UserPlus,
    ArrowRight,
    Users,
    Clock,
    XCircle,
    Info,
    Bot,
    RotateCcw,
    FileText,
    MessageSquare
} from 'lucide-react';
import { PatientDataCard } from './PatientDataCard';

interface SystemMessageProps {
    type: string;
    content: string;
    metadata?: any;
    timestamp: Date | string;
}

const SystemMessage: React.FC<SystemMessageProps> = ({
    type,
    content,
    metadata,
    timestamp
}) => {
    // Renderizar card especial para dados do paciente
    if (type === 'PATIENT_DATA_CARD' && metadata?.patientData) {
        console.log('✅ Renderizando PatientDataCard com dados:', metadata.patientData);
        return <PatientDataCard data={metadata.patientData} timestamp={timestamp.toString()} />;
    }

    // Renderizar card especial para contexto da intenção
    if (type === 'BOT_INTENT_CONTEXT' && metadata?.intentContext) {
        const ctx = metadata.intentContext;
        return (
            <div className="flex justify-center my-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl w-full shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-blue-900 text-sm">Contexto da Conversa com o Bot</span>
                    </div>
                    
                    <div className="space-y-2 text-xs text-gray-700">
                        {ctx.intent && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Intenção:</span>
                                <span className="px-2 py-1 bg-blue-100 rounded text-blue-800">
                                    {ctx.intent === 'AGENDAR' ? 'Agendamento' :
                                     ctx.intent === 'INFORMACAO' ? 'Informação' :
                                     ctx.intent === 'CANCELAR' ? 'Cancelamento' :
                                     ctx.intent === 'REAGENDAR' ? 'Reagendamento' :
                                     ctx.intent === 'ATRASO' ? 'Atraso' :
                                     ctx.intent === 'RECLAMACAO' ? 'Reclamação' :
                                     ctx.intent}
                                </span>
                            </div>
                        )}
                        
                        {ctx.sentiment && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Sentimento:</span>
                                <span className={ctx.sentiment === 'positive' ? 'text-green-600' : 
                                                  ctx.sentiment === 'negative' ? 'text-red-600' : 
                                                  'text-gray-600'}>
                                    {ctx.sentiment === 'positive' ? '😊 Positivo' :
                                     ctx.sentiment === 'negative' ? '😔 Negativo' :
                                     '😐 Neutro'}
                                </span>
                            </div>
                        )}
                        
                        {ctx.confidence !== undefined && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Confiança da IA:</span>
                                <span className="text-gray-600">{Math.round(ctx.confidence * 100)}%</span>
                            </div>
                        )}
                        
                        {ctx.entities && Object.keys(ctx.entities).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-blue-200">
                                <span className="font-medium block mb-2">Dados Coletados:</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {ctx.entities.nome && (
                                        <div><span className="text-gray-500">Nome:</span> <span className="font-medium">{ctx.entities.nome}</span></div>
                                    )}
                                    {ctx.entities.cpf && (
                                        <div><span className="text-gray-500">CPF:</span> <span className="font-medium">{ctx.entities.cpf}</span></div>
                                    )}
                                    {ctx.entities.email && (
                                        <div><span className="text-gray-500">Email:</span> <span className="font-medium">{ctx.entities.email}</span></div>
                                    )}
                                    {ctx.entities.nascimento && (
                                        <div><span className="text-gray-500">Nascimento:</span> <span className="font-medium">{ctx.entities.nascimento}</span></div>
                                    )}
                                    {ctx.entities.convenio && (
                                        <div><span className="text-gray-500">Convênio:</span> <span className="font-medium">{ctx.entities.convenio}</span></div>
                                    )}
                                    {ctx.entities.procedimento && (
                                        <div><span className="text-gray-500">Procedimento:</span> <span className="font-medium">{ctx.entities.procedimento}</span></div>
                                    )}
                                    {ctx.entities.clinica && (
                                        <div><span className="text-gray-500">Clínica:</span> <span className="font-medium">{ctx.entities.clinica}</span></div>
                                    )}
                                    {ctx.entities.data && (
                                        <div><span className="text-gray-500">Data:</span> <span className="font-medium">{ctx.entities.data}</span></div>
                                    )}
                                    {ctx.entities.horario && (
                                        <div><span className="text-gray-500">Horário:</span> <span className="font-medium">{ctx.entities.horario}</span></div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {ctx.conversationSummary && (
                            <div className="mt-3 pt-3 border-t border-blue-200">
                                <span className="font-medium block mb-2">Resumo da Conversa:</span>
                                <div className="bg-white rounded p-2 text-gray-600 whitespace-pre-wrap font-mono text-[11px]">
                                    {ctx.conversationSummary}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="text-gray-400 text-[10px] mt-3 pt-2 border-t border-blue-200">
                        {new Date(timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </div>
                </div>
            </div>
        );
    }

    const getIcon = () => {
        switch (type) {
            case 'AGENT_ASSIGNED':
                return <UserPlus className="h-3 w-3" />;
            case 'TRANSFERRED_TO_QUEUE':
                return <ArrowRight className="h-3 w-3" />;
            case 'TRANSFERRED_TO_AGENT':
                return <Users className="h-3 w-3" />;
            case 'RETURNED_TO_QUEUE':
                return <RotateCcw className="h-3 w-3" />;
            case 'TIMEOUT_INACTIVITY':
                return <Clock className="h-3 w-3" />;
            case 'CONVERSATION_CLOSED':
                return <XCircle className="h-3 w-3" />;
            case 'BOT_TO_HUMAN':
                return <Bot className="h-3 w-3" />;
            case 'PATIENT_DATA_CARD':
                return <FileText className="h-3 w-3" />;
            case 'BOT_INTENT_CONTEXT':
                return <MessageSquare className="h-3 w-3" />;
            default:
                return <Info className="h-3 w-3" />;
        }
    };

    const getColor = () => {
        switch (type) {
            case 'AGENT_ASSIGNED':
                return 'text-blue-600';
            case 'TRANSFERRED_TO_QUEUE':
            case 'TRANSFERRED_TO_AGENT':
                return 'text-purple-600';
            case 'RETURNED_TO_QUEUE':
                return 'text-orange-600';
            case 'TIMEOUT_INACTIVITY':
                return 'text-yellow-600';
            case 'CONVERSATION_CLOSED':
                return 'text-red-600';
            case 'BOT_TO_HUMAN':
                return 'text-green-600';
            case 'PATIENT_DATA_CARD':
                return 'text-indigo-600';
            case 'BOT_INTENT_CONTEXT':
                return 'text-blue-600';
            default:
                return 'text-gray-600';
        }
    };

    return (
        <div className="flex justify-center my-3">
            <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-xs flex items-center gap-2 max-w-md shadow-sm">
                <span className={getColor()}>
                    {getIcon()}
                </span>
                <span className="font-medium">{content}</span>
                <span className="text-gray-400 text-[10px] ml-1">
                    {new Date(timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </span>
            </div>
        </div>
    );
};

export default SystemMessage;
