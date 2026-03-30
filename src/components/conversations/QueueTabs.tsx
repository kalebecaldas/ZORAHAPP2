import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Bot, Users, UserCheck, Clock, Archive } from 'lucide-react';

type QueueType = 'BOT_QUEUE' | 'PRINCIPAL' | 'EM_ATENDIMENTO' | 'MINHAS_CONVERSAS' | 'ENCERRADOS';

interface QueueConfig {
    key: QueueType;
    label: string;
    icon: LucideIcon;
    /** Aba selecionada: fundo, texto e borda */
    activeSurface: string;
    /** Cor explícita do ícone (evita conflito com outras utilities no botão) */
    iconActive: string;
    iconIdle: string;
    idleHover: string;
    /** Contador na aba ativa */
    badgeActive: string;
    /** Contador na aba inativa */
    badgeIdle: string;
}

interface QueueTabsProps {
    activeQueue: QueueType;
    onQueueChange: (queue: QueueType) => void;
    counts: Record<QueueType, number>;
}

const queues: QueueConfig[] = [
    {
        key: 'BOT_QUEUE',
        label: 'Bot',
        icon: Bot,
        activeSurface: 'border border-blue-400 bg-blue-100 text-blue-800',
        iconActive: 'text-blue-700',
        iconIdle: 'text-blue-600',
        idleHover: 'hover:bg-blue-50',
        badgeActive: 'bg-white/70 text-blue-800',
        badgeIdle: 'bg-blue-100 text-blue-800'
    },
    {
        key: 'PRINCIPAL',
        label: 'Fila',
        icon: Clock,
        activeSurface: 'border border-amber-400 bg-amber-100 text-amber-900',
        iconActive: 'text-amber-800',
        iconIdle: 'text-amber-600',
        idleHover: 'hover:bg-amber-50',
        badgeActive: 'bg-white/70 text-amber-900',
        badgeIdle: 'bg-amber-100 text-amber-900'
    },
    {
        key: 'EM_ATENDIMENTO',
        label: 'Atendimento',
        icon: Users,
        activeSurface: 'border border-emerald-400 bg-emerald-100 text-emerald-900',
        iconActive: 'text-emerald-700',
        iconIdle: 'text-emerald-600',
        idleHover: 'hover:bg-emerald-50',
        badgeActive: 'bg-white/70 text-emerald-900',
        badgeIdle: 'bg-emerald-100 text-emerald-900'
    },
    {
        key: 'MINHAS_CONVERSAS',
        label: 'Minhas',
        icon: UserCheck,
        activeSurface: 'border border-violet-400 bg-violet-100 text-violet-900',
        iconActive: 'text-violet-800',
        iconIdle: 'text-violet-600',
        idleHover: 'hover:bg-violet-50',
        badgeActive: 'bg-white/80 text-violet-900',
        badgeIdle: 'bg-violet-100 text-violet-900'
    },
    {
        key: 'ENCERRADOS' as QueueType,
        label: 'Encerrados',
        icon: Archive,
        activeSurface: 'border border-red-400 bg-red-100 text-red-900',
        iconActive: 'text-red-700',
        iconIdle: 'text-red-600',
        idleHover: 'hover:bg-red-50',
        badgeActive: 'bg-white/70 text-red-900',
        badgeIdle: 'bg-red-100 text-red-900'
    }
];

export const QueueTabs: React.FC<QueueTabsProps> = ({ activeQueue, onQueueChange, counts }) => {
    return (
        <div className="border-b border-gray-200 px-4 py-2">
            <div className="flex w-full flex-wrap items-center justify-start gap-1.5">
                {queues.map((queue) => {
                    const Icon = queue.icon;
                    const count = counts[queue.key] ?? 0;
                    const isActive = activeQueue === queue.key;
                    const showCountBadge = queue.key !== 'ENCERRADOS';

                    return (
                        <button
                            key={queue.key}
                            type="button"
                            onClick={() => onQueueChange(queue.key)}
                            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                                isActive
                                    ? queue.activeSurface
                                    : `border border-transparent ${queue.idleHover}`
                            }`}
                        >
                            <Icon
                                className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? queue.iconActive : queue.iconIdle}`}
                            />
                            {isActive && <span className="whitespace-nowrap text-current">{queue.label}</span>}
                            {showCountBadge && (
                                <span
                                    className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                                        isActive ? queue.badgeActive : queue.badgeIdle
                                    }`}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
