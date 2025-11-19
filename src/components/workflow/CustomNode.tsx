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

const CustomNode = ({ data, selected }: NodeProps) => {
    const type = data.type as NodeType
    const Icon = iconMap[type] || Settings
    const color = colorMap[type] || 'bg-gray-600'
    const ports = (data.ports as Port[]) || []

    const inputs = ports.filter(p => p.type === 'input')
    const outputs = ports.filter(p => p.type === 'output')

    const getNodeLabel = (): React.ReactNode => {
        if (type === 'MESSAGE' || type === 'START') return (data.text as string) || (data.message as string)
        if (type === 'CONDITION') return (data.condition as string)
        if (type === 'API_CALL') return (data.endpoint as string)
        if (type === 'COLLECT_INFO') return ((data.fields as string[]) || []).join(', ')
        if (type === 'DATA_COLLECTION') return (data.field as string)
        return ''
    }

    return (
        <div className={`min-w-[240px] bg-white rounded-xl shadow-md border-2 transition-all ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'}`}>
            {/* Header */}
            <div className="flex items-center p-3 border-b border-gray-100">
                <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center mr-3 shadow-sm`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <div className="text-sm font-bold text-gray-800">{type.replace('_', ' ')}</div>
                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{type}</div>
                </div>
            </div>

            {/* Body */}
            <div className="p-3 bg-gray-50 rounded-b-xl">
                <div className="text-xs text-gray-600 truncate font-medium">
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
                    className="!w-4 !h-4 !bg-white !border-2 !border-gray-400 hover:!border-blue-500 hover:!bg-blue-50 transition-colors"
                    style={{ top: -8 }}
                />
            ))}

            {/* Output Handles */}
            <div className="absolute bottom-0 left-0 w-full flex justify-around px-2">
                {outputs.map((port, index) => (
                    <div key={port.id} className="relative group">
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id={port.id}
                            className="!w-4 !h-4 !bg-white !border-2 !border-gray-400 hover:!border-blue-500 hover:!bg-blue-50 transition-colors"
                            style={{
                                bottom: -8,
                                left: outputs.length > 1 ? 'auto' : '50%',
                                transform: outputs.length > 1 ? 'none' : 'translateX(-50%)'
                            }}
                        />
                        {/* Tooltip for port label */}
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-gray-800 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                            {port.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default memo(CustomNode)
