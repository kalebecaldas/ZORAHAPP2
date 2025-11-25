import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import {
    Play, MessageSquare, AlertCircle, Settings, Bot, ClipboardList,
    Users, Clock, CheckCircle, Link2, Webhook as WebhookIcon
} from 'lucide-react'
import { NodeType, Port } from '../../utils/workflowUtils'

const iconMap: Record<NodeType, React.ComponentType<{ className?: string }>> = {
    START: Play,
    MESSAGE: MessageSquare,
    CONDITION: AlertCircle,
    ACTION: Settings,
    GPT_RESPONSE: Bot,
    DATA_COLLECTION: ClipboardList,
    COLLECT_INFO: ClipboardList,
    TRANSFER_HUMAN: Users,
    DELAY: Clock,
    END: CheckCircle,
    WEBHOOK: WebhookIcon,
    API_CALL: Link2
}

const colorMap: Record<NodeType, string> = {
    START: 'bg-green-600',
    MESSAGE: 'bg-blue-600',
    CONDITION: 'bg-yellow-600',
    ACTION: 'bg-purple-600',
    GPT_RESPONSE: 'bg-indigo-600',
    DATA_COLLECTION: 'bg-teal-600',
    COLLECT_INFO: 'bg-teal-700',
    TRANSFER_HUMAN: 'bg-red-600',
    DELAY: 'bg-gray-600',
    END: 'bg-green-700',
    WEBHOOK: 'bg-pink-600',
    API_CALL: 'bg-orange-600'
}

const CustomNode = ({ data, selected }: NodeProps<any>) => {
    const type = data.type as NodeType
    const Icon = iconMap[type] || Settings
    const color = colorMap[type] || 'bg-gray-600'
    const ports = (data.ports as Port[]) || []

    const inputs = ports.filter(p => p.type === 'input')
    const outputs = ports.filter(p => p.type === 'output')

    const getNodeLabel = (): React.ReactNode => {
        // Para MESSAGE e START: buscar mensagem em vários campos possíveis
        if (type === 'MESSAGE' || type === 'START') {
            const message = (data.text as string) || 
                          (data.message as string) || 
                          (data.welcomeMessage as string) ||
                          (data.content?.message as string) ||
                          (data.content?.text as string) ||
                          (data.content?.welcomeMessage as string)
            if (message) {
                // Limitar tamanho para exibição no card (primeiras 100 caracteres)
                const truncated = message.length > 100 ? message.substring(0, 100) + '...' : message
                return truncated.replace(/\n/g, ' ').trim()
            }
            return ''
        }
        
        // Para CONDITION: mostrar a condição
        if (type === 'CONDITION') {
            const condition = (data.condition as string) || 
                            (data.content?.condition as string)
            if (condition) {
                // Limitar tamanho para exibição
                const truncated = condition.length > 80 ? condition.substring(0, 80) + '...' : condition
                return truncated
            }
            return ''
        }
        
        // Para API_CALL: mostrar endpoint
        if (type === 'API_CALL') {
            return (data.endpoint as string) || (data.content?.endpoint as string) || ''
        }
        
        // Para COLLECT_INFO: mostrar campos
        if (type === 'COLLECT_INFO') {
            const fields = (data.fields as string[]) || (data.content?.fields as string[]) || []
            return fields.join(', ')
        }
        
        // Para DATA_COLLECTION: mostrar campo
        if (type === 'DATA_COLLECTION') {
            return (data.field as string) || (data.content?.field as string) || ''
        }
        
        // Para GPT_RESPONSE: mostrar systemPrompt resumido
        if (type === 'GPT_RESPONSE') {
            const prompt = (data.systemPrompt as string) || (data.content?.systemPrompt as string) || ''
            if (prompt) {
                const truncated = prompt.length > 80 ? prompt.substring(0, 80) + '...' : prompt
                return truncated.replace(/\n/g, ' ').trim()
            }
            return ''
        }
        
        return ''
    }

    return (
        <div className={`min-w-[180px] max-w-[280px] bg-white rounded-lg shadow-md border-2 transition-all ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'}`}>
            {/* Header */}
            <div className="flex items-center p-2 border-b border-gray-100">
                <div className={`w-7 h-7 ${color} rounded-lg flex items-center justify-center mr-2 shadow-sm`}>
                    <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-800 truncate">{type.replace('_', ' ')}</div>
                    <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wider">{type}</div>
                </div>
            </div>

            {/* Body */}
            <div className="p-2 bg-gray-50 rounded-b-lg">
                <div className="text-[11px] text-gray-600 font-medium break-words line-clamp-2">
                    {getNodeLabel() || <span className="italic text-gray-400">Sem configuração</span>}
                </div>
            </div>

            {/* Input Handles */}
            {inputs.map((port) => (
                <Handle
                    key={port.id}
                    type="target"
                    position={Position.Top}
                    id={port.id}
                    className="!w-4 !h-4 !bg-blue-500 !border-2 !border-white hover:!border-blue-600 hover:!bg-blue-600 !shadow-md transition-all hover:!scale-125"
                    style={{ 
                        top: -8,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    isConnectable={true}
                />
            ))}

            {/* Output Handles */}
            <div className="absolute bottom-0 left-0 w-full flex justify-around px-1">
                {outputs.map((port, index) => (
                    <div key={port.id} className="relative group">
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id={port.id}
                            className="!w-4 !h-4 !bg-green-500 !border-2 !border-white hover:!border-green-600 hover:!bg-green-600 !shadow-md transition-all hover:!scale-125"
                            style={{
                                bottom: -8,
                                left: outputs.length > 1 ? `${(index / (outputs.length - 1)) * 100}%` : '50%',
                                transform: outputs.length > 1 ? 'translateX(-50%)' : 'translateX(-50%)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            isConnectable={true}
                        />
                        {/* Tooltip for port label */}
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] bg-gray-900 text-white px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                            {port.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default memo(CustomNode)
