import React from 'react';
import { Bot, Users, UserCheck, Clock, Archive } from 'lucide-react';

type QueueType = 'BOT_QUEUE' | 'PRINCIPAL' | 'EM_ATENDIMENTO' | 'MINHAS_CONVERSAS' | 'ENCERRADOS';

interface QueueConfig {
    key: QueueType;
    label: string;
    icon: any;
    bgClass: string;
    textClass: string;
    borderClass: string;
}

interface QueueTabsProps {
    activeQueue: QueueType;
    onQueueChange: (queue: QueueType) => void;
    counts: Record<QueueType, number>;
}

export const QueueTabs: React.FC<QueueTabsProps> = ({ activeQueue, onQueueChange, counts }) => {
    const queues: QueueConfig[] = [
        {
            key: 'BOT_QUEUE',
            label: 'Bot',
            icon: Bot,
            bgClass: 'bg-blue-100',
            textClass: 'text-blue-700',
            borderClass: 'border-blue-300'
        },
        {
            key: 'PRINCIPAL',
            label: 'Fila',
            icon: Clock,
            bgClass: 'bg-yellow-100',
            textClass: 'text-yellow-700',
            borderClass: 'border-yellow-300'
        },
        {
            key: 'EM_ATENDIMENTO',
            label: 'Atendimento',
            icon: Users,
            bgClass: 'bg-green-100',
            textClass: 'text-green-700',
            borderClass: 'border-green-300'
        },
        {
            key: 'MINHAS_CONVERSAS',
            label: 'Minhas',
            icon: UserCheck,
            bgClass: 'bg-purple-100',
            textClass: 'text-purple-700',
            borderClass: 'border-purple-300'
        },
        {
            key: 'ENCERRADOS' as QueueType,
            label: 'Encerrados',
            icon: Archive,
            bgClass: 'bg-gray-100',
            textClass: 'text-gray-700',
            borderClass: 'border-gray-300'
        }
    ];

    return (
        <div className="px-3 py-2 border-b border-gray-200">
            <div className="flex gap-1.5">
                {queues.map((queue) => {
                    const Icon = queue.icon;
                    const count = counts[queue.key] || 0;
                    const isActive = activeQueue === queue.key;

                    return (
                        <button
                            key={queue.key}
                            onClick={() => onQueueChange(queue.key)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive
                                ? `${queue.bgClass} ${queue.textClass} border ${queue.borderClass}`
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                            {isActive && <span className="whitespace-nowrap">{queue.label}</span>}
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-white/60' : 'bg-gray-200'
                                }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
