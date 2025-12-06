import React from 'react';
import { User, Copy, Clock, History, Users, Archive, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Conversation } from '../../hooks/conversations/useConversations';

interface ConversationHeaderProps {
    conversation: Conversation;
    sessionInfo?: any;
    canWrite?: boolean;
    userId?: string;
    onShowHistory?: () => void;
    onShowTransfer?: () => void;
    onShowClose?: () => void;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
    conversation,
    sessionInfo,
    canWrite = false,
    userId,
    onShowHistory,
    onShowTransfer,
    onShowClose
}) => {
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado!`);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const formatTime = (ms: number | null | undefined): string => {
        if (!ms || ms <= 0) return 'Expirada';
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const patient = conversation.patient;
    const patientName = patient?.name || conversation.phone;

    return (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Left: Patient Info */}
                <div className="flex items-center gap-4 flex-1">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold shadow-md">
                            {patient?.name ? getInitials(patient.name) : <User className="h-6 w-6" />}
                        </div>
                        {/* Online indicator */}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        {/* Name */}
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-lg font-semibold text-gray-900 truncate">
                                {patientName}
                            </h2>
                            {patient?.name && (
                                <button
                                    onClick={() => copyToClipboard(patient.name, 'Nome')}
                                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors group"
                                    title="Copiar nome"
                                >
                                    <Copy className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600" />
                                </button>
                            )}
                        </div>

                        {/* Details */}
                        <div className="flex items-center gap-3 flex-wrap text-xs">
                            {/* Phone */}
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md">
                                <span className="text-gray-600">📱</span>
                                <span className="text-gray-700 font-medium">{conversation.phone}</span>
                                <button
                                    onClick={() => copyToClipboard(conversation.phone, 'Telefone')}
                                    className="ml-1 hover:bg-gray-200 rounded p-0.5 transition-colors"
                                >
                                    <Copy className="h-3 w-3 text-gray-500" />
                                </button>
                            </div>

                            {/* CPF */}
                            {patient?.cpf && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-md">
                                    <span className="text-blue-600">🆔</span>
                                    <span className="text-blue-700 font-medium">{patient.cpf}</span>
                                    <button
                                        onClick={() => copyToClipboard(patient.cpf!, 'CPF')}
                                        className="ml-1 hover:bg-blue-100 rounded p-0.5 transition-colors"
                                    >
                                        <Copy className="h-3 w-3 text-blue-600" />
                                    </button>
                                </div>
                            )}

                            {/* Email */}
                            {patient?.email && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 rounded-md">
                                    <span className="text-purple-600">📧</span>
                                    <span className="text-purple-700 font-medium">{patient.email}</span>
                                    <button
                                        onClick={() => copyToClipboard(patient.email!, 'Email')}
                                        className="ml-1 hover:bg-purple-100 rounded p-0.5 transition-colors"
                                    >
                                        <Copy className="h-3 w-3 text-purple-600" />
                                    </button>
                                </div>
                            )}

                            {/* Birth Date */}
                            {patient?.birthDate && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-md">
                                    <span className="text-green-600">🎂</span>
                                    <span className="text-green-700 font-medium">{formatDate(patient.birthDate)}</span>
                                    <button
                                        onClick={() => copyToClipboard(formatDate(patient.birthDate!), 'Data de nascimento')}
                                        className="ml-1 hover:bg-green-100 rounded p-0.5 transition-colors"
                                    >
                                        <Copy className="h-3 w-3 text-green-600" />
                                    </button>
                                </div>
                            )}

                            {/* Insurance */}
                            {patient?.insuranceCompany && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-md">
                                    <span className="text-amber-600">💳</span>
                                    <span className="text-amber-700 font-medium">
                                        {patient.insuranceCompany}
                                        {patient.insuranceNumber && ` (${patient.insuranceNumber})`}
                                    </span>
                                    <button
                                        onClick={() => {
                                            const text = patient.insuranceNumber
                                                ? `${patient.insuranceCompany} - ${patient.insuranceNumber}`
                                                : patient.insuranceCompany!;
                                            copyToClipboard(text, 'Convênio');
                                        }}
                                        className="ml-1 hover:bg-amber-100 rounded p-0.5 transition-colors"
                                    >
                                        <Copy className="h-3 w-3 text-amber-600" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Session Status */}
                {sessionInfo && (() => {
                    const timeFormatted = sessionInfo.timeRemainingFormatted ||
                        (sessionInfo.timeRemaining ? formatTime(sessionInfo.timeRemaining) : null);

                    if (!timeFormatted && !sessionInfo.canSendMessage) {
                        return (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
                                <Clock className="h-4 w-4 text-red-600" />
                                <span className="text-xs font-medium text-red-700">Expirada</span>
                            </div>
                        );
                    }

                    if (!timeFormatted) return null;

                    const isWarning = sessionInfo.status === 'warning' ||
                        (sessionInfo.timeRemaining && sessionInfo.timeRemaining < 3600000);
                    const isExpired = sessionInfo.status === 'expired' || !sessionInfo.canSendMessage;

                    return (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isExpired ? 'bg-red-50 border-red-200' :
                            isWarning ? 'bg-yellow-50 border-yellow-200' :
                                'bg-green-50 border-green-200'
                            }`}>
                            <Clock className={`h-4 w-4 ${isExpired ? 'text-red-600' :
                                isWarning ? 'text-yellow-600' :
                                    'text-green-600'
                                }`} />
                            <span className={`text-xs font-medium ${isExpired ? 'text-red-700' :
                                isWarning ? 'text-yellow-700' :
                                    'text-green-700'
                                }`}>
                                {isExpired ? 'Expirada' :
                                    isWarning ? `⚠️ ${timeFormatted}` :
                                        `✅ ${timeFormatted}`}
                            </span>
                        </div>
                    );
                })()}

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* History button - always visible */}
                    {onShowHistory && (
                        <button
                            onClick={onShowHistory}
                            className="p-2 hover:bg-purple-50 rounded-lg transition-colors group"
                            title="Ver histórico de conversas"
                        >
                            <History className="h-5 w-5 text-purple-600 group-hover:text-purple-700" />
                        </button>
                    )}

                    {/* Transfer button - only if user has write access */}
                    {canWrite && onShowTransfer && (
                        <button
                            onClick={onShowTransfer}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                            title="Transferir conversa"
                        >
                            <Users className="h-5 w-5 text-blue-600 group-hover:text-blue-700" />
                        </button>
                    )}

                    {/* Close button - only if user has write access */}
                    {canWrite && onShowClose && (
                        <button
                            onClick={onShowClose}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                            title="Encerrar conversa"
                        >
                            <Archive className="h-5 w-5 text-red-600 group-hover:text-red-700" />
                        </button>
                    )}

                    {/* More options */}
                    <button
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Mais opções"
                    >
                        <MoreVertical className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
            </div>
        </div>
    );
};
