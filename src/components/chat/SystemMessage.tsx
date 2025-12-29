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
        
        // ✅ INCLUIR DADOS DO PROCEDIMENTO DESEJADO
        const enrichedData = {
            ...metadata.patientData,
            // Se tiver requestedService, incluir no card
            ...(metadata.requestedService && {
                procedimento: metadata.requestedService.procedure,
                clinica: metadata.requestedService.clinic,
                data: metadata.requestedService.preferredDate,
                horario: metadata.requestedService.preferredTime
            })
        };
        
        console.log('✅ Dados enriquecidos com procedimento:', enrichedData);
        return <PatientDataCard data={enrichedData} timestamp={timestamp.toString()} />;
    }

    // Renderizar card especial para contexto da intenção
    if (type === 'BOT_INTENT_CONTEXT' && metadata?.intentContext) {
        const ctx = metadata.intentContext;
        const isScheduling = ctx.intent === 'AGENDAR';
        
        return (
            <div className="flex justify-center my-4">
                <div className={`border rounded-lg p-4 max-w-2xl w-full shadow-md ${
                    isScheduling 
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' 
                        : 'bg-blue-50 border-blue-200'
                }`}>
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className={`h-5 w-5 ${isScheduling ? 'text-green-600' : 'text-blue-600'}`} />
                        <span className={`font-bold text-sm ${isScheduling ? 'text-green-900' : 'text-blue-900'}`}>
                            {isScheduling ? '📅 RESUMO DO AGENDAMENTO' : '🤖 Contexto da Conversa com o Bot'}
                        </span>
                    </div>
                    
                    {/* Intenção e Sentimento */}
                    <div className="flex gap-3 mb-3 flex-wrap">
                        {ctx.intent && (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                isScheduling 
                                    ? 'bg-green-200 text-green-900' 
                                    : 'bg-blue-200 text-blue-900'
                            }`}>
                                {ctx.intent === 'AGENDAR' ? '📅 Quer Agendar' :
                                 ctx.intent === 'INFORMACAO' ? '💬 Pedindo Info' :
                                 ctx.intent === 'CANCELAR' ? '❌ Cancelamento' :
                                 ctx.intent === 'REAGENDAR' ? '🔄 Reagendamento' :
                                 ctx.intent === 'ATRASO' ? '⏰ Atraso' :
                                 ctx.intent === 'RECLAMACAO' ? '😠 Reclamação' :
                                 ctx.intent}
                            </span>
                        )}
                        
                        {ctx.sentiment && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                ctx.sentiment === 'positive' ? 'bg-green-100 text-green-800' : 
                                ctx.sentiment === 'negative' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'
                            }`}>
                                {ctx.sentiment === 'positive' ? '😊 Positivo' :
                                 ctx.sentiment === 'negative' ? '😞 Negativo' :
                                 '😐 Neutro'}
                            </span>
                        )}
                    </div>
                    
                    {/* ✅ SEÇÃO PRINCIPAL: O QUE O PACIENTE QUER (destacado) */}
                    {isScheduling && ctx.entities && Object.keys(ctx.entities).length > 0 && (
                        <div className="bg-white rounded-lg p-3 mb-3 border-l-4 border-green-500">
                            <div className="font-bold text-sm text-gray-900 mb-2">🎯 O Paciente Quer:</div>
                            <div className="space-y-1.5 text-xs">
                                {ctx.entities.procedimento && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-green-700 min-w-[90px]">🔸 Procedimento:</span>
                                        <span className="text-gray-900 font-medium">{ctx.entities.procedimento}</span>
                                    </div>
                                )}
                                {ctx.entities.clinica && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-green-700 min-w-[90px]">🏥 Unidade:</span>
                                        <span className="text-gray-900 font-medium">{ctx.entities.clinica}</span>
                                    </div>
                                )}
                                {ctx.entities.data && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-green-700 min-w-[90px]">📅 Data:</span>
                                        <span className="text-gray-900 font-medium">{ctx.entities.data}</span>
                                    </div>
                                )}
                                {ctx.entities.horario && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-green-700 min-w-[90px]">⏰ Horário:</span>
                                        <span className="text-gray-900 font-medium">{ctx.entities.horario}</span>
                                    </div>
                                )}
                                {ctx.entities.convenio && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-green-700 min-w-[90px]">💳 Convênio:</span>
                                        <span className="text-gray-900 font-medium">{ctx.entities.convenio}</span>
                                    </div>
                                )}
                                {ctx.entities.numero_convenio && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-green-700 min-w-[90px]">📇 Nº Cart.:</span>
                                        <span className="text-gray-900 font-medium">{ctx.entities.numero_convenio}</span>
                                    </div>
                                )}
                                {/* Mostrar se não tem procedimento definido */}
                                {!ctx.entities.procedimento && (
                                    <div className="text-orange-600 text-xs italic">⚠️ Procedimento não especificado</div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Dados cadastrais */}
                    {ctx.entities && Object.keys(ctx.entities).length > 0 && (
                        <div className="bg-white rounded-lg p-3 mb-3">
                            <div className="font-semibold text-xs text-gray-700 mb-2">📋 Dados Cadastrais:</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {ctx.entities.nome && (
                                    <div><span className="text-gray-500">Nome:</span> <span className="font-medium text-gray-900">{ctx.entities.nome}</span></div>
                                )}
                                {ctx.entities.cpf && (
                                    <div><span className="text-gray-500">CPF:</span> <span className="font-medium text-gray-900">{ctx.entities.cpf}</span></div>
                                )}
                                {ctx.entities.email && (
                                    <div><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900">{ctx.entities.email}</span></div>
                                )}
                                {ctx.entities.nascimento && (
                                    <div><span className="text-gray-500">Nascimento:</span> <span className="font-medium text-gray-900">{ctx.entities.nascimento}</span></div>
                                )}
                                {/* Mostrar procedimento/clínica aqui apenas se não for agendamento */}
                                {!isScheduling && ctx.entities.procedimento && (
                                    <div><span className="text-gray-500">Procedimento:</span> <span className="font-medium text-gray-900">{ctx.entities.procedimento}</span></div>
                                )}
                                {!isScheduling && ctx.entities.clinica && (
                                    <div><span className="text-gray-500">Unidade:</span> <span className="font-medium text-gray-900">{ctx.entities.clinica}</span></div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Resumo da conversa */}
                    {ctx.conversationSummary && ctx.conversationSummary !== 'Sem histórico disponível' && (
                        <div className="bg-white rounded-lg p-3">
                            <div className="font-semibold text-xs text-gray-700 mb-2">💭 Últimas Mensagens:</div>
                            <div className="bg-gray-50 rounded p-2 text-[11px] text-gray-600 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                                {ctx.conversationSummary}
                            </div>
                        </div>
                    )}
                    
                    <div className="text-gray-400 text-[10px] mt-3 pt-2 border-t">
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
